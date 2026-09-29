import {normalizeCarouselText} from './carouselText';
test('supports string and structured slides',()=>{expect(normalizeCarouselText({slides:['Заголовок',{title:'Вопрос',accent:'Сначала',subtitle:'Пояснение'}]},2)[1]).toEqual({text:'Вопрос',accent:'Сначала',subtitle:'Пояснение'});});
test('rejects wrong counts and missing text',()=>{expect(()=>normalizeCarouselText({slides:['Один']},3)).toThrow();expect(()=>normalizeCarouselText({slides:[{}]},1)).toThrow();});
