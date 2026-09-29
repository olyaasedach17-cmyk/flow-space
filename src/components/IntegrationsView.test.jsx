import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import IntegrationsView from './IntegrationsView';
import { getGoogleIntegrationStatus } from '../services/integrationService';

jest.mock('../services/integrationService', () => ({
  INTEGRATIONS: [
    { id: 'google_sheets', label: 'Google Sheets', description: 'Таблицы', scope: 'sheets' },
    { id: 'google_drive', label: 'Google Drive', description: 'Файлы', scope: 'drive' },
  ],
  getGoogleIntegrationStatus: jest.fn(),
  startGoogleIntegration: jest.fn(),
  disconnectGoogleIntegration: jest.fn(),
}));

jest.mock('./WorkflowStudio', () => () => <div>Workflow Studio</div>);
jest.mock('./TelegramIntegrationCard', () => () => <div>Telegram</div>);

test('integration check failure is not shown as disconnected and can be retried', async () => {
  getGoogleIntegrationStatus
    .mockRejectedValueOnce(new Error('Сервис временно недоступен'))
    .mockResolvedValueOnce({ connected: true, scopes: ['sheets'] });

  render(<IntegrationsView companyId="company-1" />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Сервис временно недоступен');
  expect(screen.getAllByText('Статус неизвестен')).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: 'Сначала повторите проверку' })[0]).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Повторить проверку' }));
  expect(await screen.findByText('Подключено')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(screen.getByText('Не подключено')).toBeInTheDocument();
});
