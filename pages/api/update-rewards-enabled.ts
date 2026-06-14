import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongoclient";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mongoose from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated and is an admin
    if (!session || !session.user.admin || !session.user.owner) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const client = await clientPromise;
    const db = client.db('main');
    const collection = db.collection('configs');

    if (req.method === 'PUT') {
        const data: { enabled: boolean } = req.body;
        const { enabled } = data;


        try {
            await collection.updateOne({ name: "rewards" }, { $set: { enabled: enabled } });

            res.status(200).json({ message: "Rewards updated successfully" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error updating rewards" });
        }
    } else {
        res.status(405).json({ message: "Method Not Allowed" });
    }
}
