import {replaceCompanyTasks} from './workspaceRepository';
import {getDocs,writeBatch} from 'firebase/firestore';
jest.mock('../firebase',()=>({db:{}}));
jest.mock('firebase/firestore',()=>({collection:jest.fn(()=>({})),doc:jest.fn(),query:jest.fn(),where:jest.fn(),getDocs:jest.fn(),writeBatch:jest.fn()}));
test('stale task list cannot delete a newly created AI task',async()=>{const batch={delete:jest.fn(),set:jest.fn(),commit:jest.fn()};writeBatch.mockReturnValue(batch);getDocs.mockResolvedValue({docs:[{id:'known',ref:'known-ref'},{id:'new-ai',ref:'ai-ref'}]});await replaceCompanyTasks('a',[],{role:'owner',uid:'u',knownIds:['known']});expect(batch.delete).toHaveBeenCalledTimes(1);expect(batch.delete).toHaveBeenCalledWith('known-ref');});
