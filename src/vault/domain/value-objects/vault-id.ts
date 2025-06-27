import { Result } from '@synet/patterns';
import { ValueObject } from '@synet/patterns';

interface VaultIdProps {
  value: string;
}

/**
 * VaultId Value Object
 *
 * Represents a unique vault identifier with validation rules
 */
export class VaultId extends ValueObject<VaultIdProps> {
  private constructor(props: VaultIdProps) {
    super(props);
  }

  /**
   * Create a new VaultId with validation
   */
  public static create(id: string): Result<VaultId> {
    if (!id) {
      return Result.fail('Vault ID cannot be empty');
    }

    // Allow alphanumeric characters, numbers, dashes, and underscores
    // Removed the restrictive pattern that prevented "new" from being used
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return Result.fail('Only alphanumeric characters, numbers, dashes, and underscores are allowed in vault ID');
    }

    // Check for minimum and maximum length
    if (id.length < 2 || id.length > 64) {
      return Result.fail('Vault ID must be between 2 and 64 characters');
    }

    return Result.success(new VaultId({ value: id }));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}