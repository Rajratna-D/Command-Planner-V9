import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByRole('button');
    expect(button.className).toContain('bg-brand-500');

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('bg-danger-500');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button');
    expect(button.className).toContain('px-2.5');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('px-5');
  });

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and does not trigger onClick when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner and is disabled when loading is true', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Submit</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    // Check for spinner SVG (animate-spin class)
    const spinner = button.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner?.className.baseVal).toContain('animate-spin');

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders icon when passed', () => {
    const testIcon = <span data-testid="test-icon">icon</span>;
    render(<Button icon={testIcon}>With Icon</Button>);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
});
