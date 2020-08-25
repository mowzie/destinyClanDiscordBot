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
      case "clanwho":
        bot.simulateTyping(channelID);
        bot.sendMessage({to: channelID, message: await getOnlineMembers()});
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
    var content = `**Online Players (${allOnlineMembers.length})**\n`;
    var padName = allOnlineMembers.map(member => {return member.name}).sort((a,b) => {return b.length - a.length})[0].length + 2;
    var padActivity = allOnlineMembers.map(member => {return member.activity.name}).sort((a,b) => {return b.length - a.length})[0].length + 2;

    for(var platform in PlatformDict){
      var onlineMembers = getUsersByPlatform(allOnlineMembers, PlatformDict[platform]);
      if (onlineMembers.length > 0) {
        //  onlineMembers.map(member => {
        //   fields.push({
        //     'name': `**${member.name}**`,
        //     'value': `${member.activity.name}`,
        //     'inline': true
        //   });
        // });

        // fields.push(
        //   {
        //     'name': `${platform} (${onlineMembers.length})`,
        //     'value': onlineMembers.map(member => {
        //       return `**${member.name}** > ${member.activity.name}`
        //     }).join('\n'),
        //   }
        // );

        // var text = onlineMembers.map(member => {
        //     var name = `${member.name}`;
        //     var paddingName = ' '.repeat(padName - member.name.length);
        //     var activity = member.activity.name;
        //     var paddingActivity = ' '.repeat(padActivity - activity.length);
        //     var canJoin = member.activity.joinable ? '(j)' : '';
        //     return name + paddingName + activity + paddingActivity + canJoin;
        //   });

        //      fields.push({
        //     'name': `ffoo`,
        //     'value': text.join('\n'),
        //   });
        
        

        content += `${platform} (${onlineMembers.length})\n`;
        content += "\`\`\`";
        content += onlineMembers.map(member => {
          var name = `${member.name}`;
          var paddingName = ' '.repeat(padName - member.name.length);
          var activity = member.activity.name;
          var paddingActivity = ' '.repeat(padActivity - activity.length);
          var canJoin = member.activity.joinable ? 'j' : '';
          return name + paddingName + activity + paddingActivity + canJoin;
        }
        ).join('\n');
        content += "\`\`\`";
        content += `\n`;
      }
    }

    const logMessage = {
      title: 'Online Players',
      fields: fields
    }
    console.log(logMessage);
    return content;
  }
  else {
    console.log(logMessage);
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

