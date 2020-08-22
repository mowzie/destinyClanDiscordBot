const Discord = require('discord.io');
require('dotenv').config();
const {getBungieRequest} = require('./fetch.js');
const {getActivityData} = require('./activityData.js');

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
      case "clanon":
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


    await Promise.all(membersList.map(async (member) => {
      if (member.isOnline){
        const name = member.destinyUserInfo.LastSeenDisplayName;
        const platform = member.destinyUserInfo.membershipType;
        const lastPlatform = member.destinyUserInfo.LastSeenDisplayNameType;
        const membershipId = member.destinyUserInfo.membershipId;
        const activity = await getMemberInfo(platform, membershipId);
        allOnlineMembers.push({name, platform, lastPlatform, membershipId, activity});
      }
    }));
    var fields = [];

    for(var platform in PlatformDict){
      var onlineMembers = getUsersByPlatform(allOnlineMembers, PlatformDict[platform]);
      if (onlineMembers.length > 0) {
        fields.push(
          {
            'name': `${platform} (${onlineMembers.length})`,
            'value': onlineMembers.map(member => {
              return `${member.name} > ${member.activity.name} `
            }).join(' \n '),
          }
        )
      }
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
  return await getActivityData(membershipType, membershipId, bungieToken);
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