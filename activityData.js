const fs = require('fs')
const { adventures } = require('./enums');

async function getActivityData(profile) {
  const DestinyActivityDefinition = JSON.parse(fs.readFileSync('./manifest/DestinyActivityDefinition.json'));
  const DestinyActivityModeDefinition = JSON.parse(fs.readFileSync('./manifest/DestinyActivityModeDefinition.json'));
  const DestinyActivityTypeDefinition = JSON.parse(fs.readFileSync('./manifest/DestinyActivityTypeDefinition.json'));
  const DestinyDestinationDefinition = JSON.parse(fs.readFileSync('./manifest/DestinyDestinationDefinition.json'));

  const currentActivity = Object.keys(profile.characterActivities.data).filter(char => {
    if (profile.characterActivities.data[char].currentActivityHash === 0)
      return false;
    return true;
  }).map(character => {
    const lastActivity = profile.characterActivities.data[character];
    const name = profile.profile.data.userInfo.displayName;
    const definitionActivity = lastActivity.currentActivityHash && DestinyActivityDefinition[lastActivity.currentActivityHash];
    if (lastActivity.currentActivityModeHash === 2166136261) {
      lastActivity.currentActivityModeHash = 2043403989;
    }

    const definitionActivityMode = lastActivity.currentActivityModeHash && DestinyActivityTypeDefinition[lastActivity.currentActivityModeHash] || DestinyActivityModeDefinition[lastActivity.currentActivityModeHash];
    const definitionDestination = definitionActivity && DestinyDestinationDefinition[definitionActivity.destinationHash];
    const definitionActivityPlaylist = lastActivity.currentPlaylistActivityHash && DestinyActivityDefinition[lastActivity.currentPlaylistActivityHash]
    let lastActivityString = false;

    const memberId = profile.profile.data.userInfo.membershipId;

    if (definitionActivity === undefined) {
      lastActivityString = "send Mowzie DM"
    }

    else if (definitionActivity.placeHash === 2961497387) {
      // orbit
      lastActivityString = "In Orbit";
    } else if (lastActivity.currentActivityHash == 3858493935) {
      // tribute hall
      lastActivityString = "Tribute Hall";
    } else if (definitionActivity && definitionActivity.activityTypeHash === 103143560) {
      // Legendary lost sector
      lastActivityString = `${definitionActivity.displayProperties.name}`
    }
     else if (lastActivity.currentActivityModeHash === 3497767639) {
      // patrol
      lastActivityString = `${definitionActivityMode.displayProperties.name}: ${definitionDestination.displayProperties.name}`;
    } else if (lastActivity.currentActivityHash === 4148187374 || lastActivity.currentActivityHash === 2032534090) {
      // Dungeon: Prophecy / shattered throne

      lastActivityString = `${DestinyActivityTypeDefinition[608898761].displayProperties.name}: ${definitionActivity.displayProperties.name}`;
    } else if ([135537449, 740891329].includes(lastActivity.currentPlaylistActivityHash)) {
      // Survival, Survival: Freelance

      lastActivityString = `Crucible: Survival: ${definitionActivity.displayProperties.name}`;
    }else if (definitionActivity.activityTypeHash === 400075666) {
      // Menagerie

      lastActivityString = `${definitionActivity.originalDisplayProperties.name}`;
    }
    
    else if (lastActivity.currentActivityModeHash === 1164760504) {
      // Crucible

      lastActivityString = `Crucible: ${definitionActivityPlaylist.displayProperties.name}: ${definitionActivity.displayProperties.name}`;
    } else if (definitionActivityMode && definitionActivityMode.hash === 547513715) {
      // Nightfalls

      lastActivityString = `Nightfall: ${definitionActivity.displayProperties.description}`;
    } else if (definitionActivity && definitionActivity.activityTypeHash === 332181804) {
      // nightmare hunt
      lastActivityString = definitionActivity.originalDisplayProperties.name;
    } else if (definitionActivity && definitionActivity.activityHash === 494260690) {
      // empire hunt
      lastActivityString = definitionActivity.originalDisplayProperties.name;
    } else if (definitionActivity && definitionActivity.hash === 1340699221) {
      // wrathborn
      lastActivityString = `${definitionDestination.displayProperties.name}: Wrathborn`
    }
    
    else if (definitionActivityMode) {
      // default
      lastActivityString = `${definitionActivityMode.displayProperties.name}: ${definitionActivity.displayProperties.name}`;
    }
    const joinability = profile.profileTransitoryData.data && profile.profileTransitoryData.data.joinability;
    const partyMembers = profile.profileTransitoryData.data && profile.profileTransitoryData.data.partyMembers.map(member => {
      return member.displayName;
    });

    let isLeader = false;
    if (partyMembers === undefined) {
      console.log(name + " has no party members?");
    }
    else {
      if (partyMembers.length > 0){
        if (profile.profileTransitoryData.data.partyMembers[0].status == 11)
          isLeader = true;
      }
      partyMembers.shift();
    }

    return {
      'displayName': name,
      'character': character,
      'memberId': memberId,
      'name': lastActivityString,
      'activityHash': lastActivity.currentActivityHash, //for debugging
      'joinable': joinability && joinability.openSlots > 0 && joinability.closedReasons == 0,
      'partyMembers': partyMembers,
      'lastPlayed': lastActivity.dateActivityStarted,
      'isLeader': isLeader,
    }
  }).sort((a, b) => {
    if (a.lastPlayed > b.lastPlayed)
      return -1;
    return 1;
  })[0];

  return currentActivity;
}

module.exports = { getActivityData };