const { Keypair } = require("@solana/web3.js");

import {userSecretKey,secretKey} from "./consts";

const { getWalletBalance, transferSOL, airDropSol } = require("./solana");
const { getReturnAmount, totalAmtToBePaid, randomNumber } = require("./helper");



const userWallet = Keypair.fromSecretKey(Uint8Array.from(userSecretKey));


const treasuryWallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));


function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function totalAmtToBePaid(investment){
    return investment + 0.05*investment;
}

function getReturnAmount(investment, stakeFactor){
    return investment*stakeFactor;
}
  

const askQuestions = () => {
  const questions = [
    {
      name: "SOL",
      type: "number",
      message: "What is the amount of SOL you want to stake?",
    },
    {
      type: "rawlist",
      name: "RATIO",
      message: "What is the ratio of your staking?",
      choices: ["1:1.25", "1:1.5", "1.75", "1:2"],
      filter: function (val) {
        const stakeFactor = val.split(":")[1];
        return stakeFactor;
      },
    },
    {
      type: "number",
      name: "RANDOM",
      message: "Guess a random number from 1 to 5 (both 1, 5 included)",
      when: async (val) => {
        if (parseFloat(totalAmtToBePaid(val.SOL)) > 5) {
          console.log('You have violated the max stake limit. Stake with smaller amount.');
          return false;
        } else {
          // console.log("In when")
          console.log('You need to pay', `${totalAmtToBePaid(val.SOL)}`, 'to move forward');
          const userBalance = await getWalletBalance(
            userWallet.publicKey.toString()
          );
          if (userBalance < totalAmtToBePaid(val.SOL)) {
            console.log('You dont have enough balance in your wallet');
            return false;
          } else {
            console.log('You will get', `${getReturnAmount(val.SOL,parseFloat(val.RATIO))}`, 'if guessing the number correctly');
            return true;
          }
        }
      },
    },
  ];
  return inquirer.prompt(questions);
};

const gameExecution = async () => {
  init();
  const generateRandomNumber = randomNumber(1, 5);
  const answers = await askQuestions();
  if (answers.RANDOM) {
    const paymentSignature = await transferSOL(
      userWallet,
      treasuryWallet,
      totalAmtToBePaid(answers.SOL)
    );
    console.log(
    'Signature of payment for playing the game',
      `${paymentSignature}`
    );
    if (answers.RANDOM === generateRandomNumber) {
      await airDropSol(
        treasuryWallet,
        getReturnAmount(answers.SOL, parseFloat(answers.RATIO))
      );
      const prizeSignature = await transferSOL(
        treasuryWallet,
        userWallet,
        getReturnAmount(answers.SOL, parseFloat(answers.RATIO))
      );
      console.log('Your guess is absolutely correct');
      console.log(
        'Here is the price signature' ,`${prizeSignature}`
      );
    } else {
      console.log('Better luck next time');
    }
  }
};

gameExecution();
