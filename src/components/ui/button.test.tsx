import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    const buttonElement = screen.getByRole('button', { name: /click me/i })
    expect(buttonElement).toBeInTheDocument()
  })

  it('applies standard button attributes', () => {
    render(<Button disabled>Disabled</Button>)
    const buttonElement = screen.getByRole('button', { name: /disabled/i })
    expect(buttonElement).toBeDisabled()
  })

  it('can render as a different element using asChild', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    const linkElement = screen.getByRole('link', { name: /link button/i })
    expect(linkElement).toBeInTheDocument()
    expect(linkElement).toHaveAttribute('href', '/test')
  })
})
