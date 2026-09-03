import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the sign-in screen', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /flow space/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /войти в систему/i })).toBeInTheDocument();
});
