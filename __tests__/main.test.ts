/**
 * Unit tests for the main action functionality  
 */

import * as core from '@actions/core'
import { context } from '@actions/github'
import { run } from '../src/main'

// Mock the action dependencies
const mockSetFailed = jest.spyOn(core, 'setFailed').mockImplementation()
const mockInfo = jest.spyOn(core, 'info').mockImplementation()

// Mock context 
const originalContext = { ...context }

describe('run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset context to original state
    Object.assign(context, originalContext)
  })

  afterEach(() => {
    // Restore original context
    Object.assign(context, originalContext)
  })

  it('should skip when not a pull request', async () => {
    // Arrange
    context.payload = {}

    // Act
    await run()

    // Assert
    expect(mockInfo).toHaveBeenCalledWith('Not a pull request. Skipping action.')
    expect(mockSetFailed).not.toHaveBeenCalled()
  })
})