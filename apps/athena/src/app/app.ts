import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  imports: [RouterModule, ButtonModule],
  selector: 'app-root',
  templateUrl: './app.html'
})
export class App {
}
