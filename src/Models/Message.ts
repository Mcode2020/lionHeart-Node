// d:\lionheartfitnesskids.com\app\node-backend\src\Models\Message.ts

export class Message {
    public id: number;
    public thread_id: number;
    public user_id: number;
    public body: string;

    constructor(id: number, thread_id: number, user_id: number, body: string) {
        this.id = id;
        this.thread_id = thread_id;
        this.user_id = user_id;
        this.body = body;
    }

    static async create(data: any): Promise<Message> {
        // This is a mock implementation.
        console.log('Mock Message.create:', data);
        const newId = Math.floor(Math.random() * 100000);
        return new Message(newId, data.thread_id, data.user_id, data.body);
    }
}