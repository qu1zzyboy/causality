export interface Event {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    content: string;
    tags: string[][];
    sig: string;
}

export interface SubspaceDetails {
    id: string;
    doc_type: string;
    subspace_id: string;
    keys: {
        [key: string]: number; // e.g., "30300": 2, "30301": 2
    };
    events: string[];
    created: number;
    updated: number;
}

export interface InvitedUser {
    user_id: string;
    subspace_id: string;
    timestamp: number;
}

export interface UserInvites {
    total_invited: number;
    subspace_invited: {
        [subspaceId: string]: number;
    };
    invited_users: {
        [subspaceId: string]: InvitedUser[];
    };
}

export interface SubspaceStats {
    [kind: string]: number;
}

export interface VoteStats {
    total_votes: number;
    yes_votes: number;
    no_votes: number;
    subspace_votes: {
        [subspaceId: string]: {
            total_votes: number;
            yes_votes: number;
            no_votes: number;
        };
    };
}

export interface UserStats {
    id: string;
    doc_type: string;
    total_stats: {
        [kind: string]: number;
    };
    subspace_stats: {
        [subspaceId: string]: SubspaceStats;
    };
    created_subspaces: string[];
    joined_subspaces: string[];
    vote_stats: VoteStats;
    last_updated: number;
}

export class EventAPIService {
    private static instance: EventAPIService;
    private baseURL: string = 'https://events.teeml.ai/api';
    private maxRetries: number = 3;
    private retryDelay: number = 1000; // 1秒

    private constructor() {
        console.log('EventAPIService initialized with baseURL:', this.baseURL);
    }

    public static getInstance(): EventAPIService {
        if (!EventAPIService.instance) {
            EventAPIService.instance = new EventAPIService();
        }
        return EventAPIService.instance;
    }

    // Delay function
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check server status
    private async checkServerStatus(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            console.error('Server health check failed:', error);
            return false;
        }
    }

    // Request function with retry
    private async fetchWithRetry(url: string, options: RequestInit, retries: number = this.maxRetries): Promise<Response> {
        try {
            console.log(`Attempting to fetch: ${url}`);
            console.log('Request options:', options);
            
            const response = await fetch(url, {
                ...options,
                mode: 'cors', // 明确指定CORS模式
                headers: {
                    ...options.headers,
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                console.error('Response:', await response.text());
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
        } catch (error) {
            console.error(`Fetch attempt failed:`, error);
            if (retries > 0) {
                console.log(`Retrying... ${retries} attempts left`);
                await this.delay(this.retryDelay);
                return this.fetchWithRetry(url, options, retries - 1);
            }
            throw error;
        }
    }

    // Publish event
    async publishEvent(event: Event): Promise<any> {
        try {
            // First check server status
            const isServerHealthy = await this.checkServerStatus();
            if (!isServerHealthy) {
                throw new Error('服务器不可用');
            }

            console.log('Publishing event:', event);
            const response = await this.fetchWithRetry(`${this.baseURL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            });

            const data = await response.json();
            console.log('Event published successfully:', data);
            return data;
        } catch (error) {
            console.error('Failed to publish event:', error);
            if (error instanceof Error) {
                throw new Error(`发布事件失败: ${error.message}`);
            }
            throw new Error('发布事件失败: 未知错误');
        }
    }

    // Get all events
    async getAllEvents(): Promise<Event[]> {
        try {
            // First check server status
            const isServerHealthy = await this.checkServerStatus();
            if (!isServerHealthy) {
                throw new Error('服务器不可用');
            }

            console.log('Fetching all events');
            const response = await this.fetchWithRetry(`${this.baseURL}/events/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),  // 空对象表示获取所有事件
            });

            const data = await response.json();
            console.log('Events fetched successfully:', data);
            return data;
        } catch (error) {
            console.error('Failed to fetch events:', error);
            if (error instanceof Error) {
                throw new Error(`获取事件失败: ${error.message}`);
            }
            throw new Error('获取事件失败: 未知错误');
        }
    }

    // Get events by kind
    async getEventsByKind(kind: number): Promise<Event[]> {
        try {
            // First check server status
            const isServerHealthy = await this.checkServerStatus();
            if (!isServerHealthy) {
                throw new Error('服务器不可用');
            }

            console.log('Fetching events by kind:', kind);
            const response = await this.fetchWithRetry(`${this.baseURL}/events/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ kind }),
            });

            const data = await response.json();
            console.log('Events fetched successfully:', data);
            return data;
        } catch (error) {
            console.error('Failed to fetch events by kind:', error);
            if (error instanceof Error) {
                throw new Error(`获取事件失败: ${error.message}`);
            }
            throw new Error('获取事件失败: 未知错误');
        }
    }

    // Get events by pubkey
    async getEventsByPubkey(pubkey: string): Promise<Event[]> {
        try {
            // First check server status
            const isServerHealthy = await this.checkServerStatus();
            if (!isServerHealthy) {
                throw new Error('服务器不可用');
            }

            console.log('Fetching events by pubkey:', pubkey);
            const response = await this.fetchWithRetry(`${this.baseURL}/events/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pubkey }),
            });

            const data = await response.json();
            console.log('Events fetched successfully:', data);
            return data;
        } catch (error) {
            console.error('Failed to fetch events by pubkey:', error);
            if (error instanceof Error) {
                throw new Error(`获取事件失败: ${error.message}`);
            }
            throw new Error('获取事件失败: 未知错误');
        }
    }

    // Query events by flexible criteria
    async queryEvents(criteria: Record<string, any>): Promise<Event[]> {
        try {
            // First check server status
            const isServerHealthy = await this.checkServerStatus();
            if (!isServerHealthy) {
                throw new Error('服务器不可用');
            }

            console.log('Querying events with criteria:', criteria);
            const response = await this.fetchWithRetry(`${this.baseURL}/events/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(criteria),
            });

            const data = await response.json();
            console.log('Events queried successfully:', data);
            return data;
        } catch (error) {
            console.error('Failed to query events:', error);
            if (error instanceof Error) {
                throw new Error(`查询事件失败: ${error.message}`);
            }
            throw new Error('查询事件失败: 未知错误');
        }
    }

    // Get subspace details by SID
    async getSubspaceDetails(sid: string): Promise<SubspaceDetails> {
        try {
            // Server status check might not be strictly necessary for a GET to a specific resource if not done for others
            // but can be kept for consistency if desired.
            // const isServerHealthy = await this.checkServerStatus();
            // if (!isServerHealthy) {
            //     throw new Error('服务器不可用');
            // }

            console.log('Fetching subspace details for sid:', sid);
            // The endpoint is /api/subspaces/{sid}, not /api/events/subspaces/{sid}
            const response = await this.fetchWithRetry(`${this.baseURL}/subspaces/${sid}`, {
                method: 'GET',
                headers: {
                    // Accept header is already added by fetchWithRetry
                },
            });

            const data = await response.json();
            console.log('Subspace details fetched successfully:', data);
            return data;
        } catch (error) {
            console.error(`Failed to fetch subspace details for sid ${sid}:`, error);
            if (error instanceof Error) {
                throw new Error(`获取空间详情失败 (${sid}): ${error.message}`);
            }
            throw new Error(`获取空间详情失败 (${sid}): 未知错误`);
        }
    }

    // Get user invites
    async getUserInvites(userId: string): Promise<UserInvites> {
        try {
            console.log('Fetching user invites for:', userId);
            const response = await this.fetchWithRetry(`${this.baseURL}/users/${userId}/invites`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('User invites fetched successfully:', data);
            return data;
        } catch (error) {
            console.error(`Failed to fetch user invites for ${userId}:`, error);
            if (error instanceof Error) {
                throw new Error(`获取用户邀请信息失败 (${userId}): ${error.message}`);
            }
            throw new Error(`获取用户邀请信息失败 (${userId}): 未知错误`);
        }
    }

    // Get user stats
    async getUserStats(userId: string): Promise<UserStats> {
        try {
            console.log('Fetching user stats for:', userId);
            const response = await this.fetchWithRetry(`${this.baseURL}/users/${userId}/stats`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('User stats fetched successfully:', data);
            return data;
        } catch (error) {
            console.error(`Failed to fetch user stats for ${userId}:`, error);
            if (error instanceof Error) {
                throw new Error(`获取用户统计信息失败 (${userId}): ${error.message}`);
            }
            throw new Error(`获取用户统计信息失败 (${userId}): 未知错误`);
        }
    }
}

export const eventAPIService = EventAPIService.getInstance();
