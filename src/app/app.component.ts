import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { KnobModule } from 'primeng/knob';
import { MultiSelectModule } from 'primeng/multiselect';
import { PanelModule } from 'primeng/panel';
import { TabViewModule } from 'primeng/tabview';
import { Subject, forkJoin, interval, timer } from 'rxjs';
import { map, scan, startWith, switchMap, takeWhile } from 'rxjs/operators';
import { TimeInfo } from './time-info.type';
import { TimeService } from './time.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    TabViewModule,
    FormsModule,
    DropdownModule,
    ButtonModule,
    KnobModule,
    PanelModule,
    DatePipe,
    MultiSelectModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  // CLOCK
  currentTime = toSignal(interval(950).pipe(map(() => new Date())), {
    initialValue: new Date(),
  });

  // TIMER
  selectedMinutes = signal<number | null>(null);
  selectedSeconds = signal<number | null>(null);
  startTimer$ = new Subject<void>();
  timeLeft = toSignal(
    this.startTimer$.pipe(
      switchMap(() => {
        const overallTime =
          (this.selectedMinutes() ?? 0) * 60 + (this.selectedSeconds() ?? 0);
        return timer(0, 1_000).pipe(
          // startWith(0),
          scan((acc) => {
            return this.paused() ? acc : acc + 1;
          }, 0),
          map((n) => {
            return overallTime - n + 1;
          }),
          takeWhile((n) => n > 0, true)
        );
      })
    ),
    { initialValue: null }
  );
  timeLeftDisplay = computed(() => {
    const timeLeft = this.timeLeft();

    if (timeLeft === null || timeLeft === 0) {
      return null;
    }
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return { minutes, seconds };
  });
  paused = signal(false);
  // WORLD TIME
  private readonly timeService = inject(TimeService);
  timezones = toSignal(this.timeService.getTimeZones(), {
    initialValue: [],
  });
  locations = signal<TimeInfo[]>([
    { timezone: 'Europe/Berlin' } as TimeInfo,
    { timezone: 'Asia/Yerevan' } as TimeInfo,
    { timezone: 'Europe/Kyiv' } as TimeInfo,
  ]);
  selectedTimezones = computed(() =>
    this.locations().map((location) => location.timezone)
  );

  timeInLocations = toSignal(
    toObservable(this.locations).pipe(
      switchMap((locations) => {
        return forkJoin(
          locations.map((location) => {
            return this.timeService.getTimeByTimezone(location.timezone);
          })
        );
      })
    ),
    { initialValue: [] },
  );

  addLocation(timezones: string[]) {
    this.locations.set(timezones.map((timezone) => ({ timezone } as TimeInfo)));
  }
}
