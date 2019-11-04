# TwitterLotteryBot by Matt Dittmer

TwitterLotteryBot is a twitter bot powered by Node.js which allows twitter
users to play a "Pick a number between N and N" style game to win a shoutout.

The bot is self-regulating, so when it is started it posts a tweet saying
a game has begun. When someone makes a guess, it posts an update saying
how many spots are left, and after either the max number of guesses allowed
is reached or 30 minutes pass, it will pick a winner and start a new game.

This project uses the "Chalk" module for a prettier console experience,
and uses the "Twit" module to interface with twitter.

Use 'npm install twit' and 'npm install chalk' to set up your project.
