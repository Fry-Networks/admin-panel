import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from "../../lib/mongoclient";
import randomstring from "randomstring";
import { ObjectId } from "mongodb";
interface Data {
    email: string,
    id: string,
    order: string
    byod?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session = await getServerSession(req, res, authOptions);
    // Check if user is authenticated
    if (!session || !session.user.admin) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const client = await clientPromise;
    const db = client.db("main");
    const {email, id, order, byod} = req.body;
    const product = await db.collection("products").findOne({ _id: new ObjectId(id) });
    if(!product) {
        res.status(400).json({ message: "Invalid product id" });
        return
    }
    async function generateMinerKey(index: string) {
        //create a string of 32 random characters
        let key = randomstring.generate({ length: 32, charset: 'alphanumeric', capitalization: 'uppercase' });
        let minerKey = `${index}-${key}`;
        while (await db.collection("devices").findOne({ miner_key: minerKey })) {
            key = randomstring.generate({ length: 32, charset: 'alphanumeric', capitalization: 'uppercase' });
            minerKey = `${index}-${key}`;
        }
        return minerKey;
    }
    
    
    try {
        const miner_key = await generateMinerKey(product.key);
        await db.collection("devices").insertOne({ miner_key, email, name: product.name, created_at: new Date(), is_registered: false,  order, byod });
        res.status(200).json({ message: "ok" });
    } catch (error) {
        res.status(500).json({ message: "error" });
    }
};
