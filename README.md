This is a fanmade PvP multiplayer browser game, inspired by naruto-arena and soul-arena, that lets you pick any characters from all kinds of hoyoverse games
and play against other players in turn based strategy combat.
This is passion project I worked on and off for the past year but due to me passing away very soon, I am sadly unable to complete it.

How to set up the current version:

You need to make sure you have all the packages/dependencies installed in the server folder. Check the "packages" files for a list of what is needed.

You also need to set up a database at MongoDB and connect the server to it. Create an .env file in the server folder that stores your secret.

You should then be able to test it by opening a command line tool like windows command prompt, navigating to the server folder and run node server.js.
For the client and admin panel, open 2 more command promp windows, navigate to the Client and Admin panel folders and run live-server --port=8080 for one and live-server --port=8081 for the other.
This should open a browser window with both the admin login and the website that contains the game login.

You need to create a new user through login and then manually set admin to true in the mongoDB database for that user to be able to log into the admin panel.

This should be it for local setup.
If you want to publish it online, you need to host it somewhere properly.

Current Status of the Project:

Website:
Login and reading news articles functional.
Profile, Friends, Guilds, Ranking List, Discord, CHaracter List and How to Play not implemented yet.

Client:
Login Screen, Lobby with character selector and character info & skills view fully functional.
Store functional.
Gacha and Missions fully functional but missing css styles.
Settings, Awards, Profile, Guild, Friends & Codes not implemented yet.
Play Ranked and Play Unranked fully functional in both matchmaking, gameplay and updating ranked scores.
Lobby Play not implemented yet.
The ingame match screen uses placeholder styles for gameplay testing and don't have proper layout and style yet.
Ingame tooltip display of buff/debuff effects only supports a selected few types of effects at the moment and need to be expanded.

Server:
Gamelogic 95% implemented. Is only missing items aswell as may need some additions for characters with edge-case kits outside of the normal game scope and some effect/skill interactions need fixing.
API routes fully implemented.

Admin Panel:
Management of users, characters, effects, news articles for the website, missions, shops and gacha banners fully functional.
It only needs some minor usability updates aswell as some minor additional features, but it would already be possible to use this as it is.



There is a txt file uploaded here called "Project To-Do List", that contains all ideas and unfinished stuff I had noted down for this project in more detail.
Also here is a folder that contains all supplementary images I had intended for future use in the game or as reference:
https://drive.google.com/file/d/1H7lCMU18jVjnp0CeglGPk9pGEYSYzBEU/view?usp=sharing

For basic gameplay and stuff, here is a 2 year old version of this idea where it was still an idea for only a genshin fangame: 
https://docs.google.com/document/d/1e1xRI3GWDYaZmuWyJR_fAuCEmcOIfEpwDyodAyXTs_0/edit?tab=t.0
Some things in the current project differ from this (like no elemental reactions in hoyo arena ect), but the turn-based gameplay is pretty much the same. It is described in alot of detail there.

Lastly, there is also a Character List.txt that contains some of the planned character kit ideas.


Since I am unfortunaely unable to finish this passion project, I leave this project here open for anyone who may want to build upon it and wants to make it a reality.
If anyone decides to make something out of this, please add Lulu (the blonde wolf girl in the supplementary files) somewhere and give credit to LucyKosaki.
I don't want to be forgotten.

