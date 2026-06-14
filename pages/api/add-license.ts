import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const client = await clientPromise;
  const db = client.db('main');
  const collection = db.collection('byods');

  if (req.method === 'PUT') {
    const data: {
      license: string;
      email: string;
    } = req.body;


    try {
      const existOne = await collection.findOne({ email: data.email });

      if (!existOne) {
        await collection.insertOne({
          email: data.email,
          algo: false,
          fry: false,
          address: '',
          adder: session.user.email
        });
      }

      // Cast to align with MongoDB driver's generic Document typings.
      const update = {
        $push: {
          licenses: {
            license: data.license,
            used: false
          }
        }
      } as unknown as Record<string, unknown>;

      await collection.updateOne({ email: data.email }, update);
      res.status(200).json({ message: 'License added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error adding license' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
