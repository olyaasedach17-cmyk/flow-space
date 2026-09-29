import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import SettingsModal from './SettingsModal';
test('company context loads, edits and example remains a draft until save',()=>{
 const save=jest.fn();render(<SettingsModal isOpen promoInput="" tgChatId="" docData={{settings:{aiMemory:{salesChannels:'Сайт',companyGoals:'Повторные покупки'}}}} onboardTeam="👤 Я один" handleSaveSettings={save}/>);
 expect(screen.getByDisplayValue('Сайт')).toBeInTheDocument();fireEvent.change(screen.getByDisplayValue('Сайт'),{target:{value:'Сайт и магазин'}});expect(save).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Сохранить изменения'));expect(save.mock.calls[0][0].aiMemory.salesChannels).toBe('Сайт и магазин');expect(save.mock.calls[0][0].aiMemory.companyGoals).toBe('Повторные покупки');
 save.mockClear();fireEvent.click(screen.getByText('Заполнить пример бренда одежды (заменит черновик)'));expect(save).not.toHaveBeenCalled();expect(screen.getByDisplayValue('Женская одежда')).toBeInTheDocument();
});
