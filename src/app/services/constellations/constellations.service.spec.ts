import { TestBed } from '@angular/core/testing';

import { ConstellationsService } from './constellations.service';

describe('ConstellationsService', () => {
  let service: ConstellationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConstellationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
