import { fireEvent, render, screen } from '@testing-library/react';
import AIControlCenter from './AIControlCenter';
import { listApprovals, loadBusinessMetrics } from '../services/businessAgentService';

jest.mock('./DailyBriefPanel', () => () => <div>Daily Brief</div>);
jest.mock('../services/businessAgentService', () => ({
  askBusinessAgent: jest.fn(),
  generateBusinessContent: jest.fn(),
  listAIAudit: jest.fn(),
  listApprovals: jest.fn(),
  loadBusinessMetrics: jest.fn(),
  transitionApproval: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

test('AI metrics and approval errors stay visible instead of looking empty', async () => {
  loadBusinessMetrics.mockRejectedValue(new Error('Показатели недоступны'));
  listApprovals.mockRejectedValue(new Error('Подтверждения недоступны'));

  render(<AIControlCenter companyId="company-1" role="owner"><div>AI Team</div></AIControlCenter>);

  expect(screen.getByText('AI Team')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Обзор' }));
  expect(await screen.findByText('Показатели недоступны')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /История и подтверждения/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Подтверждения' }));
  expect(await screen.findByText('Подтверждения недоступны')).toBeInTheDocument();
  expect(screen.queryByText('Подтверждений пока нет.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
});
