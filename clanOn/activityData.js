const {getBungieRequest} = require('./fetch.js');
const activityManifest = require('./manifestActivity.json');
const modeManifest = require('./manifestMode.json');
const destinationManifest = require('./manifestDestination.json');
const {adventures}  = require('./enums');

async function getActivityData(membershipType, membershipId, bungieToken){
    const request = await getBungieRequest(`Destiny2/${membershipType}/Profile/${membershipId}`, bungieToken, {components: '100,200,204,1000'}); 
  if (request.ErrorCode != 1){
    return;
  }
  const profile = request.Response;
   if (!profile) {
    return [{}];
   }

  const currentActivity = Object.keys(profile.characterActivities.data).map(character => {
    const lastActivity = profile.characterActivities.data[character];

    const definitionActivity = lastActivity.currentActivityHash && activityManifest[lastActivity.currentActivityHash];
    const definitionActivityMode = lastActivity.currentActivityModeHash && modeManifest[lastActivity.currentActivityModeHash];
    const definitionDestination = destinationManifest[definitionActivity.destinationHash];
    const definitionActivityPlaylist = lastActivity.currentPlaylistActivityHash && activityManifest[lastActivity.currentPlaylistActivityHash]
    let lastActivityString = false;
    const name = profile.profile.data.userInfo.displayName;
    if (definitionActivity && !definitionActivity.redacted) {
      if (adventures.includes(definitionActivity.hash)) {
        // Adventures

        lastActivityString = `${('Adventure')}: ${definitionActivity.displayProperties.name}`;
      }
        else if (definitionActivity.placeHash === 2961497387) {
            // Orbit
    
            lastActivityString = "In Orbit";
          }


           else if (definitionActivityMode && definitionActivityMode.hash === 3497767639) {
          // Explore
  
            if (
                definitionDestination.displayProperties.name &&
                definitionActivity.displayProperties.name !== definitionDestination.displayProperties.name &&
                // because fuck
                definitionActivity.hash !== 4166562681 &&
                definitionActivity.hash !== 4159221189 &&
                definitionActivity.hash !== 3966792859
            ) {
                lastActivityString = `${definitionDestination.displayProperties.name}: ${definitionActivity.displayProperties.name}`;
            } else if (definitionDestination) {
                lastActivityString = `${definitionDestination.displayProperties.name}: ${definitionActivityMode.displayProperties.name}`;
            } else {
                lastActivityString = `${definitionActivityMode.displayProperties.name}: ${definitionActivity.displayProperties.name}`;
            }
        } else if (definitionActivity && definitionActivity.activityTypeHash === 400075666) {
          // Menagerie
  
          lastActivityString = `${definitionActivity.selectionScreenDisplayProperties && definitionActivity.selectionScreenDisplayProperties.name ? definitionActivity.selectionScreenDisplayProperties.name : definitionActivity.displayProperties && definitionActivity.displayProperties.name}`;
        } else if (lastActivity.currentActivityModeHash === 547513715) {
          // Nightfalls
  
          lastActivityString = definitionActivity.displayProperties.name;
        } else if (definitionActivity && definitionActivity.activityTypeHash === 838603889) {
          // Forge Ignition
  
          lastActivityString = `${definitionActivity.displayProperties.name}: ${definitionActivityPlaylist.displayProperties.name}`;
        } else if (definitionActivity && definitionActivity.activityTypeHash === 3005692706 && definitionActivity.placeHash === 4148998934) {
          // The Reckoning
  
          lastActivityString = `${definitionActivity.displayProperties.name}`;
        } else if (lastActivity.currentActivityModeHash === 1848252830){
            // Gambit

            lastActivityString = `${definitionActivityMode.displayProperties.name}: ${definitionDestination.displayProperties.name}`;
        }
        
        else if (lastActivity.currentActivityModeTypes && lastActivity.currentActivityModeTypes.indexOf(5) > -1) {
          // Crucible
  
          lastActivityString = `${definitionActivityPlaylist.displayProperties.name}: ${definitionActivity.displayProperties.name}`;
        } else if ([135537449, 740891329, 1166905690].includes(lastActivity.currentPlaylistActivityHash)) {
          // Survival, Survival: Freelances
  
          lastActivityString = `${definitionActivityPlaylist.displayProperties.name}: ${definitionActivity.displayProperties.name}`;
        } else if (definitionActivity.activityTypeHash === 332181804) {
          // Nightmare Hunts
  
          lastActivityString = definitionActivity.displayProperties.name;
        } else if (definitionActivityPlaylist.hash === 2032534090) {
          // Convert Story: The Shattered Throne -> Dungeon: The Shattered Throne
  
          lastActivityString = `${activityManifest[608898761].displayProperties.name}: ${definitionActivity.displayProperties.name}`;
        } else if (definitionActivityPlaylist.hash === 4148187374) {
          // Convert Raid: Prophecy -> Dungeon: Prophecy
  
          lastActivityString = `${activityManifest[608898761].displayProperties.name}: ${definitionActivity.displayProperties.name}`;
        } else if (definitionActivityMode && definitionActivityMode.hash === 2043403989) {
          // Raid
          lastActivityString = `${definitionActivity.displayProperties.name}`;
        }
        else if (definitionActivityMode) {
          // Default
  
          lastActivityString = `${definitionActivityMode.displayProperties.name}: ${definitionActivity.displayProperties.name}`;
        } else {
          lastActivityString = definitionActivity.displayProperties.name;
        }
      } else if (definitionActivity && definitionActivity.redacted) {
        lastActivityString = t('Classified');
      } else {
        lastActivityString = false;
      }

    const lastMode = (definitionActivityMode && definitionActivityMode.parentHashes && definitionActivityMode.parentHashes.map((hash) => modeManifest[hash])) || [];
    const joinability = profile.profileTransitoryData.data && profile.profileTransitoryData.data.joinability;
    const partyMembers = profile.profileTransitoryData.data && profile.profileTransitoryData.data.partyMembers.map(member => {
      return member.displayName;
    });
    return {
      'displayName': name,
      'character': character,
      'lastActivity': lastActivity.availableActivities[0],
      'name': lastActivityString,
      'mode': lastMode,
      'lastPlayed': profile.characters.data[character].dateLastPlayed,
      'activityHash': lastActivity.currentActivityHash,
      'definitionActivity': definitionActivity,
      'definitionActivityMode': definitionActivityMode,
      'definitionActivityPlaylist': definitionActivityPlaylist,
      'definitionDestination': definitionDestination,
      'inMatchMaking': joinability && joinability.openSlots > 0 && joinability.closedReasons == 1,
      'joinable': joinability && joinability.openSlots > 0 && joinability.closedReasons == 0,
      'joinability': joinability,
      'partyMembers': partyMembers,
    }
  }).sort((a, b) => {
    if (a.lastPlayed > b.lastPlayed)
      return -1;
    return 1;
  })[0];

  var foo = {
    'name':currentActivity.displayName,
    'activity': currentActivity.name,
    'inMM': currentActivity.inMatchMaking,
    'joinable': currentActivity.joinable,
    'joinability': currentActivity.joinability,
    'currentActivity': currentActivity.definitionActivity,
    'party': currentActivity.partyMembers,
  };

  return currentActivity;
}

module.exports = { getActivityData };