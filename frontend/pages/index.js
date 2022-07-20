import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BigNumber, Contract, ethers, providers, utils } from "ethers";
import React, { useEffect, useRef, useState } from "react";
import { abi, RANDOM_GAME_CONTRACT_ADDRESS } from "../constants";
import { FETCH_CREATED_GAME } from "../queries";
import { subgraphQuery } from "../utils";
import { useAccount ,useContract ,useSigner} from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'


export default function Home() {
  const zero = BigNumber.from("0");
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [entryFee, setEntryFee] = useState(zero);
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState();
  const [players, setPlayers] = useState([]);
  const [logs, setLogs] = useState([]);
  const forceUpdate = React.useReducer(() => ({}), {})[1];
  const { address, isConnected } = useAccount();
  const { data: signer } = useSigner();
  const randomGameContract = useContract({
    addressOrName: RANDOM_GAME_CONTRACT_ADDRESS,
    contractInterface: abi,
    signerOrProvider: signer,
  }
  );
  console.log(entryFee);
  const startGame = async () => {
    try {
      setLoading(true);
      const tx = await randomGameContract.startGame(maxPlayers, entryFee);
      await tx.wait();
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };
  const joinGame = async () => {
    try {
      setLoading(true);
      const tx = await randomGameContract.joinGame({
        value: entryFee,
      });
      await tx.wait();
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };
  const checkIfGameStarted = async () => {
    try {
      console.log(randomGameContract)
      const _gameStarted = await randomGameContract.gameStarted();
      console.log(_gameStarted);
      const _gameArray = await subgraphQuery(FETCH_CREATED_GAME());
      const _game = _gameArray.games[0];
      let _logs = [];
      if (_gameStarted) {
        _logs = [`Game has started with ID: ${_game.id}`];
        if (_game.players && _game.players.length > 0) {
          _logs.push(
            `${_game.players.length} / ${_game.maxPlayers} already joined 👀 `
          );
          _game.players.forEach((player) => {
            _logs.push(`${player} joined 🏃‍♂️`);
          });
        }
        setEntryFee(BigNumber.from(_game.entryFee));
        setMaxPlayers(_game.maxPlayers);
      } else if (!gameStarted && _game.winner) {
        _logs = [
          `Last game has ended with ID: ${_game.id}`,
          `Winner is: ${_game.winner} 🎉 `,
          `Waiting for host to start new game....`,
        ];

        setWinner(_game.winner);
      }
      setLogs(_logs);
      setPlayers(_game.players);
      setGameStarted(_gameStarted);
      forceUpdate();
    } catch (error) {
      console.error(error);
    }
  };
  const getOwner = async () => {
    try {
      // console.log(randomGameContract)
      // console.log(await signer.getAddress())
      const _owner = await randomGameContract.owner();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };
  async function check(){
    console.log(randomGameContract)
    console.log(await signer.getAddress())
  }
  useEffect(() => {
    if (signer) {
      getOwner();
      checkIfGameStarted();
      setInterval(() => {
        checkIfGameStarted();
      }, 2000);
    }
  }, [signer]);

  const renderButton = () => {
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }
    if (gameStarted) {
      if (players.length === maxPlayers) {
        return (
          <button className={styles.button} disabled>
            Choosing winner...
          </button>
        );
      }
      return (
        <div>
          <button className={styles.button} onClick={joinGame}>
            Join Game 🚀
          </button>
        </div>
      );
    }
    if (isOwner && !gameStarted) {
      return (
        <div>
          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              setEntryFee(
                e.target.value >= 0
                  ? utils.parseEther(e.target.value.toString())
                  : zero
              );
            }}
            placeholder="Entry Fee (ETH)"
          />
          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              setMaxPlayers(e.target.value ?? 0);
            }}
            placeholder="Max players"
          />
          <button className={styles.button} onClick={startGame}>
            Start Game 🚀
          </button>
        </div>
      );
    }
  }
return (
    <div className="">
      <Head>
        <title>Random Winner Game</title>
        <meta name="description" content="Generated by Dinesh Aitham" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <div className='flex flex-row-reverse p-5 bg-inherit'>
          <ConnectButton />
        </div>
        <div className={styles.main}>
          <div>
            <h1 className={styles.title}>Welcome to Random Winner Game!</h1>
            <div className={styles.description}>
              Its a lottery game where a winner is chosen at random and wins the
              entire lottery pool
            </div>
            {renderButton()}
            {logs &&
              logs.map((log, index) => (
                <div className={styles.log} key={index}>
                  {log}
                </div>
              ))}
          </div>
          <div>
            <img className={styles.image} src="./randomWinner.png" />
          </div>
        </div>
      </div>
    </div>
  )
}
