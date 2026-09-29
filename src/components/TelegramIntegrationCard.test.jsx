import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TelegramIntegrationCard from './TelegramIntegrationCard';
import { beginTelegramConnection, completeTelegramConnection, getTelegramInfo, testTelegramConnection } from '../services/notificationService';

jest.mock('../services/notificationService', () => ({
  beginTelegramConnection: jest.fn(),
  completeTelegramConnection: jest.fn(),
  disconnectTelegramConnection: jest.fn(),
  getTelegramInfo: jest.fn(),
  testTelegramConnection: jest.fn(),
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
});

test('connects through the bot and exposes a delivery test', async () => {
  getTelegramInfo
    .mockResolvedValueOnce({ configured: true, connected: false, username: 'flow_bot', canManage: true })
    .mockResolvedValueOnce({ configured: true, connected: true, username: 'flow_bot', connectedAccount: { username: 'olya' }, canManage: true });
  beginTelegramConnection.mockResolvedValue({ username: 'flow_bot', deepLink: 'https://t.me/flow_bot?start=fs_code' });
  completeTelegramConnection.mockResolvedValue({ ok: true, chatId: '12345' });
  testTelegramConnection.mockResolvedValue({ ok: true });

  render(<TelegramIntegrationCard companyId="company-1" />);
  const connectButton = await screen.findByRole('button', { name: 'Подключить Telegram' });
  await waitFor(() => expect(connectButton).toBeEnabled());
  fireEvent.click(connectButton);
  expect(await screen.findByRole('link', { name: 'Открыть бота' })).toHaveAttribute('href', 'https://t.me/flow_bot?start=fs_code');
  fireEvent.click(await screen.findByRole('button', { name: 'Я нажала Start' }));
  expect(await screen.findByText('@olya')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Отправить тест' }));
  await waitFor(() => expect(testTelegramConnection).toHaveBeenCalledWith('company-1'));
});

test('shows members the status without connection controls', async () => {
  getTelegramInfo.mockResolvedValue({ configured: true, connected: true, username: 'flow_bot', canManage: false });
  render(<TelegramIntegrationCard companyId="company-1" />);
  expect(await screen.findByText('Управлять подключением может собственник пространства.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Отключить' })).not.toBeInTheDocument();
});
