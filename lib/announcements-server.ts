import { ObjectId } from 'mongodb';

export function ensureObjectId(id: string) {
  if (!ObjectId.isValid(id)) {
    throw new Error('Invalid announcement id');
  }

  return new ObjectId(id);
}
