import {generateAIImage} from './imageService';
import {authFetch} from './integrationService';
jest.mock('./integrationService',()=>({authFetch:jest.fn()}));
test('polls the same generation without creating a second paid request',async()=>{authFetch.mockResolvedValueOnce({status:'processing',id:'job',ticket:'signed'}).mockResolvedValueOnce({status:'completed',image:{url:'https://example.com/test.png'}});const promise=generateAIImage({prompt:'Test'});const result=await promise;expect(result.status).toBe('completed');expect(JSON.parse(authFetch.mock.calls[1][1].body)).toEqual({action:'status',id:'job',ticket:'signed'});});
