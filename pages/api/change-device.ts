import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongoclient";
import mongoose from "mongoose";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { ObjectId } from "mongodb";
import randomstring from 'randomstring';
interface Data {
    id: string,
    miner_key: string
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session = await getServerSession(req, res, authOptions);
    // Check if user is authenticated
    if (!session || !session.user.admin) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
        
    const data: Data = req.body;

    const { id, miner_key } = data

    const client = await clientPromise;

    const db = client.db('main');

    const collection = db.collection('devices');

    const existingDevice = await collection.findOne({
        miner_key: miner_key
    });

    if (!existingDevice) {
        res.status(404).json({ message: "Device not found" });
        return;
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
        const product = await db.collection("products").findOne({ _id: new ObjectId(id) });
        if(!product) {
            res.status(400).json({ message: "Invalid product id" });
            return
        }
        const new_miner_key = await generateMinerKey(product.key);


        await db.collection("devices").updateOne({ miner_key }, { $set: { miner_key: new_miner_key, name: product.name } });
        
        

        res.status(200).json({ message: "ok" });
    } catch (error) {
        res.status(500).json({ message: "error" });
    }

};