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
import { ethers } from 'ethers';

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
        ValidateSubspaceCreateEvent(subspaceEvent);
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
    async joinSubspace(subspaceID: string): Promise<NostrEvent> {
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }
        if (!this.secretKey) {
            throw new Error('No secret key available');
        }

        const joinEvent = NewSubspaceJoinEvent(subspaceID);
        ValidateSubspaceJoinEvent(joinEvent);

        const signedJoinEvent = finalizeEvent(toNostrEvent(joinEvent), this.secretKey);
        await this.relay.publish(signedJoinEvent);
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

        if (!this.relay) {
            throw new Error('Not connected to relay for publishing post');
        }
        const result = await this.relay.publish(signedPostEvent);
        console.log('Successfully published post event:', result);
        return signedPostEvent;
    }
    // Vote in subspace
    async publishVote(params: {
        subspaceID: string;
        targetId: string;
        vote: string;
        content: string;
    }): Promise<NostrEvent> {
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }
        if (!this.secretKey) {
            throw new Error('No secret key available');
        }

        const voteEvent = await newVoteEvent(params.subspaceID, params.content);
        if (!voteEvent) {
            throw new Error('Failed to create vote event');
        }

        voteEvent.setVote(params.targetId, params.vote);

        const signedVoteEvent = finalizeEvent(toNostrEventGov(voteEvent), this.secretKey) as NostrEvent;
        await this.relay.publish(signedVoteEvent);
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
        const signedProposeEvent = finalizeEventBySig(nostrEvent, address, sig) as NostrEvent;
        console.log('signedProposeEvent', signedProposeEvent);
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }
        const result = await this.relay.publish(signedProposeEvent);
        console.log('Successfully published subspace event:', result);
        return signedProposeEvent; 
        
    }

    // Publish invite event in subspace
    async publishInvite(params: {
        subspaceID: string;
        inviteePubkey: string;
        rules?: string;
        content: string;
    }): Promise<NostrEvent> {
        if (!this.relay) {
            throw new Error('Not connected to relay');
        }
        if (!this.secretKey) {
            throw new Error('No secret key available');
        }

        const inviteEvent = await newInviteEvent(params.subspaceID, params.content);
        if (!inviteEvent) {
            throw new Error('Failed to create invite event');
        }

        inviteEvent.setInvite(params.inviteePubkey, params.rules);

        const signedInviteEvent = finalizeEvent(toNostrEventGov(inviteEvent), this.secretKey) as NostrEvent;
        await this.relay.publish(signedInviteEvent);
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
}
// Create singleton instance
export const nostrService = new NostrService(); 
console.log('typeof window', typeof window)
console.log(window)
