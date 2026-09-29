import {writePublication} from './publicationService';
import {callServerAI} from './aiService';
jest.mock('./aiService',()=>({callServerAI:jest.fn(),safeParseAIJSON:JSON.parse}));
test('personal request excludes all company context',async()=>{callServerAI.mockResolvedValue({choices:[{message:{content:'Личный пост'}}]});await writePublication({action:'post',mode:'personal',context:{products:'SECRET_COMPANY'},topic:'Моя прогулка'});expect(JSON.stringify(callServerAI.mock.calls)).not.toContain('SECRET_COMPANY');expect(JSON.stringify(callServerAI.mock.calls)).toContain('Моя прогулка');});
