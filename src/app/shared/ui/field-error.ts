import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bs-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <span class="mt-1 block text-sm text-blood" role="alert">{{ error() }}</span>
    }
  `,
})
export class FieldError {
  readonly error = input<string | null | undefined>(null);
}

@Component({
  selector: 'bs-form-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message()) {
      <p class="border-l-4 border-blood bg-blood/10 p-3 text-sm" role="alert">{{ message() }}</p>
    }
  `,
})
export class FormMessage {
  readonly message = input<string | null>(null);
}
