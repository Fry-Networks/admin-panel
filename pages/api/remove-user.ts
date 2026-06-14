import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongoclient";
import mongoose from "mongoose";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
interface Data {
    user_id: string,
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session = await getServerSession(req, res, authOptions);
    // Check if user is authenticated
    if (!session || !session.user.admin) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const data: Data = req.body;

    const { user_id } = data

    const client = await clientPromise;

    const db = client.db('main');

    const collection = db.collection('users');

    
    const existingUser = await collection.findOne({
        _id: new mongoose.Types.ObjectId(user_id)
    });

    if (!existingUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    try {

        
        await collection.deleteOne({
            _id:new mongoose.Types.ObjectId(user_id)
        });

        res.status(200).json({ message: "ok" });
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove user' });
    }

};