const activityManifest = require('./manifestActivity.json');
const modeManifest = require('./manifestMode.json');
const modeTypeManifest = require('./manifestModeType.json');
const destinationManifest = require('./manifestDestination.json');
const { adventures } = require('./enums');

async function getActivityData(profile) {

  const currentActivity = Object.keys(profile.characterActivities.data).map(character => {
    const lastActivity = profile.characterActivities.data[character];

    const definitionActivity = lastActivity.currentActivityHash && activityManifest[lastActivity.currentActivityHash];
    const definitionActivityMode = lastActivity.currentActivityModeHash && modeTypeManifest[lastActivity.currentActivityModeHash] || modeManifest[lastActivity.currentActivityModeHash];
    const definitionDestination = destinationManifest[definitionActivity.destinationHash];
    const definitionActivityPlaylist = lastActivity.currentPlaylistActivityHash && activityManifest[lastActivity.currentPlaylistActivityHash]
    let lastActivityString = false;
    const name = profile.profile.data.userInfo.displayName;
    if (definitionActivity.placeHash === 2961497387) {
      // orbit
      lastActivityString = "In Orbit";
    } else if (lastActivity.currentActivityHash == 3858493935) {
      // tribute hall
      lastActivityString = "Tribute Hall";
    } else if (lastActivity.currentActivityModeHash === 3497767639) {
      // patrol
      lastActivityString = `${definitionActivityMode.displayProperties.name}: ${definitionDestination.displayProperties.name}`;
    } else if (lastActivity.currentActivityHash === 4148187374) {
      // Dungeon: Prophecy

      lastActivityString = `${modeTypeManifest[608898761].displayProperties.name}: ${definitionActivity.displayProperties.name}`;
    } else if (lastActivity.currentActivityModeTypes && lastActivity.currentActivityModeTypes.indexOf(5) > -1) {
      // Crucible

      lastActivityString = `Crucible: ${definitionActivityPlaylist.displayProperties.name}: ${definitionActivity.displayProperties.name}`;
    } else if (definitionActivity && definitionActivityMode.hash === 547513715) {
      // Nightfalls

      lastActivityString = definitionActivity.displayProperties.name;
    } else if (definitionActivityMode) {
      // default
      lastActivityString = `${definitionActivityMode.displayProperties.name}: ${definitionActivity.displayProperties.name}`;
    }

    const joinability = profile.profileTransitoryData.data && profile.profileTransitoryData.data.joinability;
    const partyMembers = profile.profileTransitoryData.data && profile.profileTransitoryData.data.partyMembers.map(member => {
      return member.displayName;
    });
    if (partyMembers === undefined) {
      console.log(name + " has no party members?");
    }
    else
      partyMembers.shift();

    let isLeader = false;
    if (partyMembers.length > 0){
      if (profile.profileTransitoryData.data.partyMembers[0].status == 11)
        isLeader = true;
    }

    return {
      'displayName': name,
      'character': character,
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