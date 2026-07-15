import { Schema, type, MapSchema } from "@colyseus/schema";

/** Replicated player (server-owned). Clients never write these fields. */
export class PlayerState extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "Player";
  @type("number") x: number = 100;
  @type("number") y: number = 100;
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;
  @type("number") facing: number = 0;
}

/** Full room state patched to clients by Colyseus. */
export class AnvilRoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("number") tick: number = 0;
  @type("string") roomName: string = "anvil";
}
