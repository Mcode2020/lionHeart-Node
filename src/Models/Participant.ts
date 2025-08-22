// d:\lionheartfitnesskids.com\app\node-backend\src\Models\Participant.ts

export class Participant {
    public thread_id: number;
    public user_id: number;
    public last_read: Date | null;

    constructor(thread_id: number, user_id: number, last_read: Date | null = null) {
        this.thread_id = thread_id;
        this.user_id = user_id;
        this.last_read = last_read;
    }

    static async firstOrCreate(data: any): Promise<Participant> {
        // This is a mock implementation.
        console.log('Mock Participant.firstOrCreate:', data);
        return new Participant(data.thread_id, data.user_id, data.last_read);
    }

    public save(): void {
        console.log('Mock Participant.save():', this);
    }
}