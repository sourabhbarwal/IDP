import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import LoginPage from '../pages/auth/LoginPage';
import authReducer from '../store/slices/authSlice';

function renderWithProviders(ui: React.ReactElement) {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
  );
}

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    renderWithProviders(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'bad-email' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when password is empty', async () => {
    renderWithProviders(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });
});
