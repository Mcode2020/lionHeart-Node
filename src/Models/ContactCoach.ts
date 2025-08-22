// d:\lionheartfitnesskids.com\app\node-backend\src\Models\ContactCoach.ts

export class ContactCoach {
    public id: number;
    public user_id: number;
    public coach_id: number;
    public message: string;

    constructor(id: number, user_id: number, coach_id: number, message: string) {
        this.id = id;
        this.user_id = user_id;
        this.coach_id = coach_id;
        this.message = message;
    }

    static async create(data: any): Promise<ContactCoach> {
        // This is a mock implementation. In a real application, you would insert into a database.
        console.log('Mock ContactCoach.create:', data);
        const newId = Math.floor(Math.random() * 100000);
        return new ContactCoach(newId, data.user_id, data.coach_id, data.message);
    }
}