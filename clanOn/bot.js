const Discord = require('discord.io');
require('dotenv').config();
const {getBungieRequest} = require('./fetch.js');
const activityManifest = require('./manifestActivity.json');
const modeManifest = require('./manifestMode.json');
const destinationManifest = require('./manifestDestination.json');
const prefix = '!';
const bungieToken = process.env.TOKEN;
const groupId = process.env.GROUPID;
const bot = new Discord.Client({
  token: process.env.DISCORDTOKEN,
  autorun: true
});

bot.once('ready', () => {
  console.log('Ready!');
    bot.setPresence({
      game: {
              name: '!clanon',
      }
    });
});

bot.on('disconnect', function(erMsg, code) {
  console.log('----- Bot disconnected from Discord with code', code, 'for reason:', erMsg, '-----');
  bot.connect();
});

bot.on('message', async function(user, userID, channelID, message, event) {
//  console.log(`received \`${message}\` from \`${user}\``);
  if (message.startsWith(prefix)) { // Message starts with prefix
    let command = message.slice(prefix.length).split(" "); // Split message into words
    if (command.length != 1){
      return;
    }
    switch (command[0]) { // Execute code depending on first word
      case "clanwho":
        bot.simulateTyping(channelID);
        bot.sendMessage({to: channelID, embed: await getOnlineMembers()});
        break;
    }
  }
});



async function getOnlineMembers(){
  const results = await getBungieRequest(`GroupV2/${groupId}/Members/`, bungieToken);

  if (results.ErrorCode == 1) {
    var allOnlineMembers = [];
    var membersList = results.Response.results;


    await asyncForEach(membersList, (async function(member){
      if (member.isOnline){
        const name = member.destinyUserInfo.LastSeenDisplayName;
        const platform = member.destinyUserInfo.membershipType;
        const lastPlatform = member.destinyUserInfo.LastSeenDisplayNameType;
        const membershipId = member.destinyUserInfo.membershipId;
        const activity = await getMemberInfo(platform, membershipId);
        allOnlineMembers.push({name, platform, lastPlatform, membershipId, activity});
      }
    }));
    
    //console.log(allOnlineMembers);

    var fields = [];

    for(var platform in PlatformDict){
      var onlineMembers = getUsersByPlatform(allOnlineMembers, PlatformDict[platform]);
      if (onlineMembers.length > 0)
        console.log(onlineMembers);
        fields.push(
          {
            'name': `${platform} (${onlineMembers.length})`,
            'value': onlineMembers.map(member => {
              return `${member.name} ${member.activity.name}${member.isMatchMaking ? '(MM)' : ''}`
            }).join(' \n '),
          }
        )
    }

    const logMessage = {
      title: 'Online Players',
      fields: fields
    }
    console.log(logMessage);
    return logMessage;
  }
  else {
    console.log(results);
  }
}

function getUsersByPlatform(membersList, platform){
  return membersList
    .filter(function (item) {
      return item.lastPlatform === platform
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}));
}

async function getMemberInfo(membershipType, membershipId){
  const request = await getBungieRequest(`Destiny2/${membershipType}/Profile/${membershipId}`, bungieToken, {components: '200,204,1000'}); 
  if (request.ErrorCode != 1){
    return;
  }
  const profile = request.Response;
  if (profile === undefined){
    return;
  }

  // console.log(profile.characterActivities.data);
  var foo = Object.keys(profile.characterActivities.data).map(character => {
    var mode = profile.characterActivities.data[character].currentActivityModeHash;
    var activityHash = profile.characterActivities.data[character].currentActivityHash;
    var activity = activityManifest[activityHash];
    var destinationHash = activity && activity.destinationHash;
    var destination = destinationManifest[destinationHash];
    return {
      'id': character,
      'lastPlayed': profile.characterActivities.data[character].dateActivityStarted,
      'activityHash': activity,
      'name': `${modeManifest[mode] && modeManifest[mode].displayProperties.name} ${activityManifest[activityHash] && activityManifest[activityHash].displayProperties.name}`,
      'destination': destination && destination.displayProperties.name,
      'inMatchMaking': profile.profileTransitoryData.data.joinability.closedReasons == 1
    }
  }).sort((a, b) => {
    if (a.lastPlayed > b.lastPlayed)
      return -1;
    return 1;
  });

  return foo[0];
}

//this is hardcoded from the bungieAPI
const PlatformDict = {
  Xbox: 1,
  Playstation: 2,
  Steam: 3,
  Battlenet: 4,
  Stadia: 5,
};


async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}