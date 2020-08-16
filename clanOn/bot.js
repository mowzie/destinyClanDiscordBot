const Discord = require('discord.io');
const fetch = require('node-fetch');
require('dotenv').config();
const prefix = '!';

const bungieApiRoot = 'https://www.bungie.net/Platform';
const groupId = process.env.GROUPID;
console.log(groupId);
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

function getBungieApiRequest(url){
  return fetch(url, 
    {
      method: 'GET',
      headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.TOKEN
      }
    }).then(response => response.json());
}

async function getOnlineMembers(){
  const results = await getBungieApiRequest(`${bungieApiRoot}/GroupV2/${groupId}/Members/`);

  if (results.ErrorCode == 1) {
    var allOnlineMembers = [];
    var membersList = results.Response.results;

    membersList.forEach(function(member){
      if (member.isOnline){
        const name = member.destinyUserInfo.displayName;
        const platform = member.destinyUserInfo.LastSeenDisplayNameType;
        allOnlineMembers.push({name, platform});
      }
    });

   var fields = [];

    for(var platform in PlatformDict){
      var onlineMembers = getUsersByPlatform(allOnlineMembers, PlatformDict[platform]);
      if (onlineMembers.length > 0)
        fields.push(
          {
            'name': `${platform} (${onlineMembers.length})`,
            'value': onlineMembers,
          }
        )
    }

    const logMessage = {
      title: 'Online Players',
      fields: fields
    }

    return logMessage;
  }
  else {
    console.log(results);
  }
}

function getUsersByPlatform(membersList, platform){
  return membersList
    .filter(function (item) {
      return item.platform === platform
    })
    .map(member => member.name)
    .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}))
    .join(', ');
}

//this is hardcoded from the bungieAPI
const PlatformDict = {
  Xbox: 1,
  Psn: 2,
  PC: 3,
  PC2: 4,
  Stadia: 5,
};
