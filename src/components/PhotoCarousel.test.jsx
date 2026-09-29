import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import PhotoCarousel from './PhotoCarousel';
import {callServerAI} from '../services/aiService';
jest.mock('../services/aiService',()=>({callServerAI:jest.fn(),safeParseAIJSON:JSON.parse}));
test('photos, editable Russian text and downloadable slides',async()=>{
 const original=global.Image;global.Image=class{width=800;height=1000;decode(){return Promise.resolve();}};
 const fillText=jest.fn();const context=jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:jest.fn(),fillRect:jest.fn(),measureText:t=>({width:t.length*20}),fillText});
 const data=jest.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,AA==');
 callServerAI.mockResolvedValue({choices:[{message:{content:JSON.stringify({slides:['Новая коллекция','Выберите свой образ']})}}]});
 try{render(<PhotoCarousel/>);fireEvent.change(screen.getByLabelText('Оформление'),{target:{value:'classic'}});expect(screen.getByText('Создать карусель')).toBeDisabled();fireEvent.change(screen.getByLabelText('Фотографии карусели'),{target:{files:[new File(['photo'],'a.png',{type:'image/png'}),new File(['photo'],'b.png',{type:'image/png'})]}});await screen.findByAltText('Фото 2');fireEvent.change(screen.getByLabelText('Тема и факты для карусели'),{target:{value:'Новая коллекция'}});fireEvent.click(screen.getByText('Создать карусель'));await screen.findByDisplayValue('Выберите свой образ');await waitFor(()=>expect(screen.getByText('Скачать слайд 2')).toHaveAttribute('download','carousel-02.png'));expect(fillText).toHaveBeenCalledWith('Новая коллекция',80,980);expect(JSON.stringify(callServerAI.mock.calls)).not.toContain('base64');}finally{global.Image=original;context.mockRestore();data.mockRestore();}
});
test('editorial style paints full photo, gradient and separate Russian accent',async()=>{
 const {renderSlide}=await import('./PhotoCarousel');const original=global.Image;global.Image=class{width=1080;height=1350;decode(){return Promise.resolve();}};
 const fillText=jest.fn(),addColorStop=jest.fn();const context=jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:jest.fn(),fillRect:jest.fn(),createLinearGradient:()=>({addColorStop}),measureText:t=>({width:t.length*18}),fillText});const data=jest.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,AA==');
 try{await renderSlide('photo','Как познакомить',0,{style:'editorial',accent:'В переписке',subtitle:'Чтобы были благодарны оба'});expect(addColorStop).toHaveBeenCalledTimes(3);expect(fillText.mock.calls.some(([text])=>text==='В ПЕРЕПИСКЕ')).toBe(true);expect(fillText.mock.calls.some(([text])=>text==='КАК ПОЗНАКОМИТЬ')).toBe(true);}finally{global.Image=original;context.mockRestore();data.mockRestore();}
});
test('saved result appears before editing controls and survives failed regeneration',async()=>{
 callServerAI.mockRejectedValue(new Error('Сервис временно недоступен'));
 render(<PhotoCarousel sourcePost="Пост" regenerateText initialSlides={[{photo:'a',text:'Первый'},{photo:'b',text:'Второй'}]} initialExports={['data:image/png;base64,AA==']}/>);
 const result=screen.getByAltText('Готовый слайд 1');
 expect(result.compareDocumentPosition(screen.getByLabelText('Фотографии карусели'))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 fireEvent.click(screen.getByText('Создать карусель'));
 await screen.findByRole('alert');
 expect(screen.getByText('Скачать слайд 1')).toBeInTheDocument();
});
test('downloads all ready slides with one button',()=>{const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});try{render(<PhotoCarousel initialExports={['data:image/png;base64,AA==','data:image/png;base64,BB==']}/>);fireEvent.click(screen.getByText('Скачать все'));expect(click).toHaveBeenCalledTimes(2);}finally{click.mockRestore();}});
