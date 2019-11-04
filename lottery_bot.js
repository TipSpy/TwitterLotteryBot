// Import the Chalk package for a prettier console experience :)
var chalk = require('chalk');

// Import the 'Twit' package for the twitter API
var Twit = require('twit');

// Import the file with the API keys.
// File is used for easier re-use later.
var config = require('./config');

// Initialize the bot
var Bot = new Twit(config);

// Check if authentication succeeds
Bot.get('account/verify_credentials', {
    include_entities: false,
    skip_status: true,
    include_email: false
}, onAuthenticated);

// Handle Authentication
function onAuthenticated(err) {
    if (err) {
        console.log(err)
    } else {
    console.log(chalk.green("Authentication Succesfull!"));
    beginGameStream();
    startGame();
    }
}

// Initialize variables for the game
var handle = "Lotto4S";
var gameKey = "@Lotto4s #GuessingGame ";
var guessData = {};
var numGuesses = 0;
var maxGuesses = 10;
var minNumber = 1;
var maxNumber = 10;
var usernamesGuessed = [];
var numbersGuessed = [];
var lastWinner = "";

// Open stream to constantly get tweets pertaining to the game
var guessingGameStream = Bot.stream('statuses/filter', {
    track: gameKey,
    tweet_mode: "extended"
});

function beginGameStream() {
    guessingGameStream.on('tweet', function(tweet) {

        // Check if the tweet is a retweet and check if its a tweet from the bot, to eliminate stupid shit from happening..
        if(!tweet.retweeted_status && tweet.user.screen_name !== handle) {
            // Log that a new tweet was found
            console.log(chalk.bold(chalk.magenta("New Entry Found:")));
            // get tweet ID, username of tweeter, tweet content, and log them all
            var username = tweet.user.screen_name;
            var tweetId = tweet.id_str;
            var content = tweet.text;
            var text = content.substring(gameKey.length);
            // remove everything except for the guessed number
            var guess = parseInt(text);
            console.log(chalk.cyan("Username: ") + chalk.yellow(username));
            console.log(chalk.cyan("Tweet ID: ") + chalk.yellow(tweetId));
            console.log(chalk.cyan("Tweet Content: ") + chalk.yellow(content));
            console.log(chalk.cyan("User's Guess: ") + chalk.green(guess));

            // Favorite the User's tweet to let them know the bot has seen it.
            Bot.post('favorites/create', { id: tweetId }, function(err, response){
                if(err) {
                    console.log("Couldn't favorite the user's tweet for some reason. Oh well.");
                } else {
                    console.log("Favorited the user's tweet. That's cool.");
                }
            });

            // Check if the user has already been entered into the lottery pot
            // or if the number has already been guessed;
            if(usernamesGuessed.indexOf(username) > -1) {
                // User has already been entered into the lottery pot, so roast them
                console.log(chalk.red("User has already been entered into the lottery!"));
                console.log(chalk.red(chalk.bold("Guess IGNORED!")));
                reply(tweetId, username, "You can only guess once, stoopid!");
            } 
            // User is not in the pot already, so check if their number is taken already:
            else {
                if(numbersGuessed.indexOf(guess) > -1) {
                    // The number is already taken, let them know to guess a different number
                    console.log(chalk.red("The Number has already been guessed!"));
                    console.log(chalk.red(chalk.bold("Guess IGNORED!")));
                    reply(tweetId, username, "Someone else guessed '" + guess + "' already, try again!");

                } 
                // Number is not taken already, so let's check if its even a valid guess
                else {
                    if((guess > maxNumber) || (guess < minNumber) || (isNaN(guess))) {
                        // The number is an invalid guess, so ignore it and tell them to try again
                        console.log(chalk.red("The Number is an invalid guess!"));
                        console.log(chalk.red(chalk.bold("Guess IGNORED!")));
                        if(isNaN(guess)) {
                            reply(tweetId, username, "Seriously? '" + text + "' isn't even a number, let alone between " + minNumber + " and " + maxNumber + ". Go back to kindergarten, then guess again.");
                        } else {
                            reply(tweetId, username, "Come on now, " + guess + " isn't between " + minNumber + " and " + maxNumber + "! Go study math, then guess again.");
                        }
                    } else {
                        //Wow, they passed the tests, lets add them to the pot!
                        console.log(chalk.green("The user is not in the pot and guessed a good number."));
                        numGuesses++;
                        usernamesGuessed.push(username);
                        numbersGuessed.push(guess);
                        guessData[guess] = username;
                        //console.log(guessData);
                        console.log(chalk.red("Guesses/Max Guesses: ") + chalk.blue(numGuesses) + chalk.white("/") + chalk.magenta(maxGuesses));

                        if(numGuesses === maxGuesses) {
                            console.log(chalk.bold(chalk.magenta("Max number of guesses reached! Ending current game...")));
                            finishGame();
                        } else {
                            console.log(chalk.bold(chalk.green("Max number of guesses not reached! Posting update...")));
                            postUpdate();
                        }
                    }
                }
            }
        }
    });
}

// Function for replying to user's tweets
function reply(tweetID, user, msg) {
    Bot.post('statuses/update', {
        // ID of tweet to reply to
        in_reply_to_status_id:tweetID,
        // Message to reply with.
        status: "@" + user + " " + msg
        // After we tweet we use a callback function to check if our tweet has been succesful.
    }, onTweet)
}

// Callback for sending any tweets which checks if the bot has hit the rate limit
// and if it has, updates the Bio of the bot to let people know the bot is OOS.
var isAsleep = false;
function onTweet(err) {
    if(err) {
        if(err.code === 88){
            console.log('rate limit reached')
            Bot.post('account/update_profile', {
                name:'Lotto4Shoutout 💤',
                description: "We've hit our tweet rate limit. We'll be back in about 15 minutes!\nPlay simple lottery games to win a shoutout! Nothing is at stake, but you could get a shoutout!\nLast Winner: @" + lastWinner
            }, onTweet);
            isAsleep = true
        }
    } else {
        if(isAsleep) {
            Bot.post('account/update_profile', {
                name:'Lotto4Shoutout',
                description: "Play simple lottery games to win a shoutout! Nothing is at stake, but you could get a shoutout!\nLast Winner: @" + lastWinner
            }, onTweet);
            isAsleep = false
        }
    }
}

// Variable to store the ID of the previous update for deletion later
var lastUpdate = "";

// Function to post updates when a new player enters the pot
function postUpdate() {
    
    var difference = (maxGuesses - numGuesses);
    var numsGuessed = "";

    // Put all of the guessed numbers from the array into a nice string for posting.
    for(var i = 0; i < numbersGuessed.length; i++) {
        if(i === 0) {
            numsGuessed = numbersGuessed[i];
        } else {
            numsGuessed = numsGuessed + ", " + numbersGuessed[i]
        }
    }

    // If there's only room for one more guess, post a different update so it looks better.
    if(difference === 1) {
        tweet = {
            status: "Another user has entered a guess! Only one spot left! Enter by tweeting at me \"@Lotto4S #GuessingGame #\" replacing # with your guess."
        }
    } else {
        // If it's the first user, post a different update so it looks better.
        if(difference === (maxGuesses - 1)) {
            tweet = {
                status: "The first user has entered their guess! There are "+difference+" spots left! Enter by tweeting at me \"@Lotto4S #GuessingGame #\" replacing # with your guess."
            }
        } else {
            tweet = {
                status: "Another user has entered a guess! There are "+difference+" spots left! Enter by tweeting at me \"@Lotto4S #GuessingGame #\" replacing # with your guess."
            }
        }
    }
    
    if(lastUpdate != "") {
        Bot.post('statuses/destroy/:id', { id: lastUpdate }, function (err, data, response) {
            console.log(chalk.cyan("Last update with id '"+lastUpdate+"' deleted."));
            Bot.post('statuses/update', tweet, function(err, data, response) {
                console.log(chalk.cyan("Update Posted."));
                lastUpdate = data.id_str;
            });
        });
    } else {
        Bot.post('statuses/update', tweet, function(err, data, response) {
            console.log(chalk.cyan("Update Posted."));
            lastUpdate = data.id_str;
        });
    }
}

// Function to start a new game
var lastStartID = "";
function startGame() {
    console.log(chalk.bold(chalk.magenta("Starting new game...")));
    guessData = {};
    numGuesses = 0;
    usernamesGuessed = [];
    numbersGuessed = [];
    console.log(chalk.red("Game Parameters Reset!"));

    var tweet = {
        status: "A new game has started!\nI've picked a number between " + minNumber + " and " + maxNumber + ".\nTry to guess my number by tweeting '@Lotto4S #GuessingGame #', replacing # with your guess.\nThe closest guess to my number wins a shoutout. This game will last for 30 mins, good luck!"
    }

    if(lastStartID != "") {
        Bot.post('statuses/destroy/:id', { id: lastStartID }, function (err, data, response) {
            console.log(chalk.cyan("Last 'Game Started' Tweet with id '"+lastStartID+"' deleted."));
            Bot.post('statuses/update', tweet, function(err, data, response) {
                console.log(chalk.cyan("'Game Started' tweet posted!"));
                lastStartID = data.id_str;
            });
        });
    } else {
        Bot.post('statuses/update', tweet, function(err, data, response) {
            console.log(chalk.cyan("'Game Started' tweet posted!"));
            lastStartID = data.id_str;
        });
    }

    // Set a timer to finish the game after 30 minutes.
    setTimeout(function(){
        finishGame();
    }, 1800000);

}

// Function to pick a winner of a game
function finishGame() {
        // Pick a random number in the game's range
        var pick = Math.floor(Math.random() * (maxNumber - minNumber)) + minNumber;

        // Check if anyone has guessed
        if(numGuesses != 0) {
            // At least 1 person guessed, so continue with picking a winner.

            // Select the number from the array of guessed numbers that is closest to "pick"
            var winningNumber = numbersGuessed.reduce(function(prev, curr) {
                return (Math.abs(curr - pick) < Math.abs(prev - pick) ? curr : prev);
            });

            var winner = winningNumber.toString(10);

            var winnerUsername = guessData[winner];

            lastWinner = winnerUsername;

            console.log(chalk.bold(chalk.magenta('The current game has ended!')));
            console.log(chalk.cyan("Picked Number: ") + chalk.red(pick));
            console.log(chalk.cyan("Closest Guess: ") + chalk.red(winningNumber));
            console.log(chalk.cyan("Winner's Username: ") + chalk.red(winnerUsername));

            if(pick === winningNumber) {
                tweet = {
                    status: "The game has ended! My number was " + pick + ", and @" + winnerUsername + " guessed it spot on! Congrats!\nGo follow @" + winnerUsername + "!"
                }
            } else {
                tweet = {
                    status: "The game has ended! My number was " + pick + ". The closest guess was " + winningNumber + ", which was guessed by @" + winnerUsername + "! Congrats!\nGo follow @" + winnerUsername + "!"
                }
            }

        } else {
            // Nobody guessed, so RIP.

            // Tweet that nobody won :/
            tweet = {
                status: "The game has ended, but nobody guessed any numbers! My number was " + pick + ", in case anyone was wondering.\nSince nobody guessed, I'll give a shoutout to my creator, @CokeSucka! Go follow him!"
            }
        }
        if(lastUpdate != "") {
            Bot.post('statuses/destroy/:id', { id: lastUpdate }, function (err, data, response) {
                console.log(chalk.cyan("Last update with id '"+lastUpdate+"' deleted."));
            });
        }

        Bot.post('statuses/update', tweet, function(err, data, response) {
            console.log(chalk.cyan("Game Results Posted."));
        });

        Bot.post('account/update_profile', {
            name:'Lotto4Shoutout',
            description: "Play simple lottery games to win a shoutout! Nothing is at stake, but you could get a shoutout!\nLast Winner: @" + lastWinner
        }, onTweet);

        console.log(chalk.cyan("Bio updated."));

        startGame();

}