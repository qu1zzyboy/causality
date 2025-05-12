import { finalizeEvent, generateSecretKey, getPublicKey, serializeEvent,finalizeEventBySig } from '../../node_modules/@ai-chen2050/nostr-tools/lib/esm/pure.js';
import { Relay, useWebSocketImplementation } from '../../node_modules/@ai-chen2050/nostr-tools/lib/esm/relay.js';
import {
  NewSubspaceCreateEvent,
  ValidateSubspaceCreateEvent,
  NewSubspaceJoinEvent,
  ValidateSubspaceJoinEvent,
  toNostrEvent,
} from '../../node_modules/@ai-chen2050/nostr-tools/lib/esm/cip/subspace.js'
import {KindSubspaceCreate} from '../../node_modules/@ai-chen2050/nostr-tools/lib/esm/cip/constants.js'
import {newPostEvent, newVoteEvent, newProposeEvent, newInviteEvent, toNostrEvent as toNostrEventGov,setProposal} from '../../node_modules/@ai-chen2050/nostr-tools/lib/esm/cip/cip01/governance.js'
import { newMintEvent} from '../../node_modules/@ai-chen2050/crelay-js-sdk/lib/esm/cip/cip01/governance.js';
import { ethers } from 'ethers';
import { Modal, Form, Input, InputNumber, message } from 'antd';

interface NostrEvent {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    content: string;
    tags: string[][];
    sig: string;
}

// First define a SubspaceEvent interface
interface SubspaceEvent {
    subspaceID: string;
    name: string;
    ops: string;
    rules: string;
    description: string;
    imageURL: string;
    // Other possible fields
}

export class NostrService {
    private relay: Relay | null = null;
    private secretKey: string | null = null;
    private publicKey: string | null = null;

    constructor(private relayURL: string = 'wss://relay.teeml.ai') {
        // Initialize WebSocket implementation
        if (typeof window !== 'undefined') {
            const WebSocket = window.WebSocket;
            useWebSocketImplementation(WebSocket);
        }
    }

    // Set relay instance
    setRelay(relay: Relay) {
        this.relay = relay;
    }

    // Disconnect
    disconnect() {
        if (this.relay) {
            this.relay.close();
            this.relay = null;
        }
    }

    // Connect to relay server
    async connect(): Promise<void> {
        try {
            this.relay = await Relay.connect(this.relayURL);
            console.log(`Connected to ${this.relay.url}`);
        } catch (error) {
            console.error('Failed to connect to relay:', error);
            throw error;
        }
    }

    // Generate new key pair
    generateKeys(): { secretKey: string; publicKey: string } {
        const sk = generateSecretKey();
        const pk = getPublicKey(sk);
        this.secretKey = sk;
        this.publicKey = pk;
        return {
            secretKey: sk,
            publicKey: pk,
        };
    }

    // Get current key pair
    getKeys(): { secretKey: string | null; publicKey: string | null } {
        return {
            secretKey: this.secretKey,
            publicKey: this.publicKey,
        };
    }

    // Set key pair
    setKeys(secretKey: string, publicKey: string) {
        this.secretKey = secretKey;
        this.publicKey = publicKey;
    }

    // Create new subspace
    async createSubspace(params: {
        name: string;
        ops: string;
        rules: string;
        description: string;
        imageURL: string;
    }): Promise<SubspaceEvent> {
        const subspaceEvent = NewSubspaceCreateEvent(
            params.name,
            params.ops,
            params.rules,
            params.description,
            params.imageURL
        );
        console.log('subspaceEvent', subspaceEvent);
        return subspaceEvent;
    }

    // Modify parameter types
    async PublishCreateSubspace(subspaceEvent: SubspaceEvent, address: string, sig: string): Promise<NostrEvent> {
        console.log('sig', sig);
        console.log('address', address);
        const nostrEvent = toNostrEvent(subspaceEvent);
        const signedSubspaceEvent = finalizeEventBySig(nostrEvent, address, sig) as NostrEvent;
        console.log('signedSubspaceEvent', signedSubspaceEvent);
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }
        const result = await this.relay.publish(signedSubspaceEvent);
        console.log('Successfully published subspace event:', result);
        return signedSubspaceEvent;
    }

    // Join subspace
    async createJoinSubspace(subspaceID: string): Promise<any> {
        const joinEvent = NewSubspaceJoinEvent(subspaceID,'');
        ValidateSubspaceJoinEvent(joinEvent);
        console.log('joinEvent', joinEvent);
        return joinEvent;
    }

    async publishJoinSubspace(rawJoinEvent: any, address: string, sig: string): Promise<NostrEvent> {
        const eventToFinalize = toNostrEvent(rawJoinEvent);
        const signedJoinEvent = finalizeEventBySig(eventToFinalize, address, sig) as NostrEvent;
        
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }
        
        const result = await this.relay.publish(signedJoinEvent);
        console.log('Successfully published join event:', result);
        return signedJoinEvent;
    }

    async createPost(params: {
        subspaceID: string;
        parentHash: string;
        content: string;
        contentType: string;
    }){
        const postEvent = await newPostEvent(params.subspaceID, params.content);
        postEvent.setParent(params.parentHash);
        postEvent.setContentType(params.contentType);
        return postEvent;
    }
    async publishPost(rawPostEvent: any, address: string, sig: string): Promise<NostrEvent> {

        const eventToFinalize = toNostrEventGov(rawPostEvent);
        const signedPostEvent = finalizeEventBySig(eventToFinalize, address, sig) as NostrEvent;
        console.log('signedPostEvent', signedPostEvent);
        if (!this.relay) {
            throw new Error('Not connected to relay for publishing post');
        }
        const result = await this.relay.publish(signedPostEvent);
        console.log('Successfully published post event:', result);
        return signedPostEvent;
    }

    // Create a new vote event structure
    async createVote(params: {
        subspaceID: string;
        targetId: string; // ID of the proposal being voted on
        vote: string;     // e.g., "yes", "no", "abstain"
        content: string;  // Reason for the vote / comment
    }): Promise<any> { // Return type should be the raw event structure type from your library
        // No relay check needed here as we are just creating the event structure
        const voteEvent = await newVoteEvent(params.subspaceID, params.content);
        if (!voteEvent) {
            throw new Error('Failed to create vote event structure');
        }
        voteEvent.setVote(params.targetId, params.vote);
        // console.log('Created raw vote event:', JSON.stringify(voteEvent, null, 2));
        return voteEvent; // Return the raw event
    }

    // Publish a pre-structured and externally signed vote event
    async publishVote(rawVoteEvent: any, pubkey: string, signature: string): Promise<NostrEvent> {
        // console.log('publishVote - rawVoteEvent:', JSON.stringify(rawVoteEvent, null, 2));
        // console.log('publishVote - pubkey:', pubkey);

        const eventToFinalize = toNostrEventGov(rawVoteEvent);
        // Ensure pubkey and signature don't have '0x' prefix for finalizeEventBySig
        const nostrPubkey = pubkey.startsWith('0x') ? pubkey.slice(2) : pubkey;
        const nostrSignature = signature.startsWith('0x') ? signature.slice(2) : signature;

        const signedVoteEvent = finalizeEventBySig(eventToFinalize, nostrPubkey, nostrSignature) as NostrEvent;
        console.log('publishVote - signedVoteEvent:', JSON.stringify(signedVoteEvent, null, 2));

        if (!this.relay) {
            throw new Error('Not connected to relay for publishing vote');
        }

        const result = await this.relay.publish(signedVoteEvent);
        // console.log('Successfully published signed vote event:', result);
        return signedVoteEvent;
    }

    // Publish propose event in subspace
    async createPropose(params: {
        subspaceID: string;
        content: string;
    }): Promise<NostrEvent> {
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }

        const proposeEvent = await newProposeEvent(params.subspaceID, params.content);
        proposeEvent.setProposal('normal','normal_rule');
        if (!proposeEvent) {
            throw new Error('Failed to create propose event');
        }

        return proposeEvent;
    }

    async PublishPropose(proposeEvent: NostrEvent, address: string, sig: string): Promise<NostrEvent> {
        console.log('sig', sig);
        console.log('address', address);
        const nostrEvent = toNostrEventGov(proposeEvent);
        console.log('nostrEvent', nostrEvent);
        const signedProposeEvent = finalizeEventBySig(nostrEvent, address, sig) as NostrEvent;
        console.log('signedProposeEvent', signedProposeEvent);
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }
        const result = await this.relay.publish(signedProposeEvent);
        console.log('Successfully published subspace event:', result);
        return signedProposeEvent; 
        
    }

    // Create invite event
    async createInvite(params: {
        subspaceID: string;
        inviteePubkey: string;
        rules?: string;
        content: string;
    }): Promise<any> {
        const inviteEvent = await newInviteEvent(params.subspaceID, params.content);
        if (!inviteEvent) {
            throw new Error('Failed to create invite event');
        }

        inviteEvent.setInvite(params.inviteePubkey, params.rules);
        return inviteEvent;
    }

    // Publish invite event
    async publishInvite(rawInviteEvent: any, address: string, sig: string): Promise<NostrEvent> {
        const eventToFinalize = toNostrEventGov(rawInviteEvent);
        const signedInviteEvent = finalizeEventBySig(eventToFinalize, address, sig) as NostrEvent;
        
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }
        
        const result = await this.relay.publish(signedInviteEvent);
        console.log('Successfully published invite event:', result);
        return signedInviteEvent;
    }

    // Subscribe to subspace events
    subscribeToSubspace(subspaceID: string, callback: (event: NostrEvent) => void): void {
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }

        this.relay.subscribe(
            [
                {
                    kinds: [KindSubspaceCreate],
                    limit: 1,
                },
            ],
            {
                onevent(event: NostrEvent) {
                    callback(event);
                },
            }
        );
    }
    recoverAddress(signedMessage: string, signature: string) {
        const recoveredAddress = ethers.utils.verifyMessage(signedMessage, signature);
        console.log("Recovered address:", recoveredAddress);
        return recoveredAddress;
    }

    // Create mint event
    async createMint(params: {
        subspaceID: string;
        tokenName: string;
        tokenSymbol: string;
        tokenDecimals: string;
        initialSupply: string;
        dropRatio: string;
        content: string;
    }): Promise<any> {
        const mintEvent = await newMintEvent(params.subspaceID, params.content);
        if (!mintEvent) {
            throw new Error('Failed to create mint event');
        }
        mintEvent.setTokenInfo(params.tokenName, params.tokenSymbol, params.tokenDecimals);
        mintEvent.setMintDetails(params.initialSupply, params.dropRatio);
        console.log('mintEvent', mintEvent);
        return mintEvent;
    }

    // Publish mint event
    async publishMint(rawMintEvent: any, address: string, sig: string): Promise<NostrEvent> {
        const signedMintEvent = finalizeEventBySig(rawMintEvent, address, sig) as NostrEvent;

        if (!this.relay) {
            throw new Error('Not connected to relay');
        }

        const result = await this.relay.publish(signedMintEvent);
        console.log('Successfully published mint event:', result);
        return signedMintEvent;
    }
}
// Create singleton instance
export const nostrService = new NostrService(); 
console.log('typeof window', typeof window)
console.log(window)
