const Discord = require('discord.io');
const fs = require('fs')
require('dotenv').config();
const { getBungieRequest } = require('./fetch.js');
const { getActivityData } = require('./activityData.js');
const { platforms } = require('./enums');
const { response } = require('express');
const prefix = '!';
const bungieToken = process.env.TOKEN;
const groupId = process.env.GROUPID;

//Setup DiscordBot
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
  if (message.startsWith(prefix)) { // Message starts with prefix
    let command = message.slice(prefix.length).split(" "); // Split message into words
    if (command.length != 1) {
      return;
    }
    switch (command[0]) { // Execute code depending on first word
      case "clanon":
        console.log(channelID)
        await updateManifest(channelID);
        bot.simulateTyping(channelID);
        var onlineMembers = (await getOnlineMembers()).sort((a, b) => a.name.localeCompare(b.name, undefined, {
          sensitivity: 'base'
        }));;
        var messageContent = tabulateMembers(onlineMembers);
        bot.sendMessage({
          to: channelID,
          message: messageContent
        });
        break;
    }
  }
});

async function getOnlineMembers() {
  const results = await getBungieRequest(`Platform/GroupV2/${groupId}/Members/`, bungieToken);

  if (results.ErrorCode == 1) {
    var onlineMembers = [];
    var membersList = results.Response.results;

    await Promise.all(membersList.map(async (member) => {
      if (member.isOnline) {
        const name = member.destinyUserInfo.displayName;
        const platform = member.destinyUserInfo.membershipType;
        const lastPlatform = member.destinyUserInfo.LastSeenDisplayNameType;
        const membershipId = member.destinyUserInfo.membershipId;
        const activity = await getMemberInfo(platform, membershipId);
        if (activity) {
        onlineMembers.push({
          name,
          platform,
          lastPlatform,
          membershipId,
          activity
        })
      }
    }
    }));
    return onlineMembers;
  }
}

function tabulateMembers(onlineMembers) {
  var content = `**Online Players (${onlineMembers.length})**\n`;

  for (var platform in platforms) {
    var platformMembers = getUsersByPlatform(onlineMembers, platforms[platform]);

    if (platformMembers.length > 0) {

      content += `${platform} (${platformMembers.length})\n`;

      platformMembers = combineFireteamMemembers(platformMembers);
      var padName = platformMembers.map(member => {
        if (member.hasClanFireteam)
          member.pad = member.pad + 1;
        return member.pad;
      }).sort((a, b) => {
        return b - a
      })[0] + 1;

      // Not using this, but i want to keep it for later
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

      content += "\`\`\`";
      content += platformMembers.map(member => {
        var name = `${member.name.trim()}`;
        var paddingName = ' '.repeat(Math.max(0, (padName - member.pad)));
        var activityName = member.activity.name;
        return name + paddingName + activityName;
      }).join('\n');
      content += "\`\`\`\n";
    }
  }
  return content;
}

function getUsersByPlatform(membersList, platform) {
  return membersList
    .filter(function(item) {
      return item.lastPlatform === platform
    });
}

async function getMemberInfo(membershipType, membershipId) {
  const request = await getBungieRequest(`Platform/Destiny2/${membershipType}/Profile/${membershipId}`, bungieToken, {
    components: '100,204,1000'
  });
  if (request.ErrorCode != 1) {
    return;
  }
  const profile = request.Response;
  if (!profile) {
    return [{}];
  }
  return await getActivityData(profile);
}

function combineFireteamMemembers(membersList) {
  return membersList.reduce((m, obj) => {
    var old = null;
    old = m.find(mem => mem.activity.partyMembers && mem.activity.partyMembers.includes(obj.name));
    obj.pad = obj.name.trim().length;
    if (!old) {
      
      m.push(obj);
    } else {
      if (obj.activity.isLeader) {
        old.pad = Math.min(obj.name.trim().length, old.pad);  
        old.name = `${obj.name} \n ${old.name} `;
      }
      else {
        old.pad = Math.max(obj.name.trim().length, old.pad);
        old.name += ` \n ${obj.name} `;
      }

      old.hasClanFireteam = true;
    }

    return m;
  }, []);
}



async function updateManifest(channelId) {
  var manifestFile = '.\\manifest\\manifest.json';
  
  var request = await getBungieRequest('Platform/Destiny2/Manifest', bungieToken);
  
  if (fs.existsSync(manifestFile)) {
    var manifest = JSON.parse(fs.readFileSync(manifestFile));
    if (request.ErrorCode != 1) {
      console.log('request.errorcode something other than 1');
      return;
    }

    if (manifest.version == request.Response.version)
    {
      return;
    }
  }
  manifest = request.Response;

  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

  var DestinyActivityDefinition = manifest.jsonWorldComponentContentPaths.en.DestinyActivityDefinition;
  var DestinyActivityTypeDefinition = manifest.jsonWorldComponentContentPaths.en.DestinyActivityTypeDefinition;
  var DestinyActivityModeDefinition = manifest.jsonWorldComponentContentPaths.en.DestinyActivityModeDefinition;
  var DestinyDestinationDefinition = manifest.jsonWorldComponentContentPaths.en.DestinyDestinationDefinition;

  doManifestStuff(DestinyActivityDefinition, Object.keys({DestinyActivityDefinition})[0]);
  doManifestStuff(DestinyActivityTypeDefinition, Object.keys({DestinyActivityTypeDefinition})[0]);
  doManifestStuff(DestinyActivityModeDefinition, Object.keys({DestinyActivityModeDefinition})[0]);
  doManifestStuff(DestinyDestinationDefinition, Object.keys({DestinyDestinationDefinition})[0]);
  bot.sendMessage({
    to: channelId,
    message: 'i updated the manifest files!'
  });
}

async function doManifestStuff(url, name) {
  var manifest = await getBungieRequest(url, bungieToken);
  fs.writeFileSync(`.\\manifest\\${name}.json`, JSON.stringify(manifest, null, 2));
}