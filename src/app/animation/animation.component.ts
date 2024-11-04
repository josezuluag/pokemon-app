import { Component, Renderer2, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { PokemonService } from '../services/pokemon.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-animation',
  templateUrl: './animation.component.html',
  styleUrls: ['./animation.component.scss'],
  providers: [MessageService]
})
export class AnimationComponent implements OnDestroy {
  pokemonNameOrId = new BehaviorSubject<string>('');
  loading$ = new BehaviorSubject<boolean>(false);
  pokemonData$ = new BehaviorSubject<any>(null);
  currentSprite$ = new BehaviorSubject<string>('');
  @ViewChild('pokemonImage', { static: false }) pokemonImage!: ElementRef;
  
  private rotationDegree = 0;
  private animationSubscription: Subscription | null = null;
  private frontSprite: string = '';
  private backSprite: string = '';

  constructor(
    private pokemonService: PokemonService,
    private renderer: Renderer2,
    private messageService: MessageService
  ) {}

  ngOnDestroy() {
    this.stopAnimation(); // Limpiar cualquier animación activa al destruir el componente
  }

  loadPokemon() {
    const nameOrId = this.pokemonNameOrId.getValue();
    if (nameOrId) {
      this.stopAnimation(); // Detenemos cualquier animación previa antes de cargar un nuevo Pokémon
      this.loading$.next(true);

      this.pokemonService.getPokemon(nameOrId).subscribe({
        next: (pokemon) => {
          this.pokemonData$.next(pokemon);
          this.frontSprite = pokemon.sprites.front_default;
          this.backSprite = pokemon.sprites.back_default;
          this.currentSprite$.next(this.frontSprite); // Iniciar con el sprite frontal
          this.playSound(pokemon.species.name.toLowerCase());
          this.startAnimation();
          this.loading$.next(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Nombre o ID de Pokémon no válido' });
          this.loading$.next(false);
        }
      });
    } else {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Escriba un nombre o ID para cargar' });
    }
  }

  playSound(name: string) {
    const audio = new Audio(`https://play.pokemonshowdown.com/audio/cries/${name}.mp3`);
    audio.load();
    audio.play().catch(error => console.error("Error al reproducir el audio:", error));
  }

  startAnimation() {
    this.rotationDegree = 0; // Reiniciar el ángulo de rotación
    this.animationSubscription = interval(100).subscribe(() => {
      // Incrementar el ángulo de rotación
      this.rotationDegree = (this.rotationDegree + 5) % 360;

      // Alternar entre el sprite frontal y el trasero
      if (this.rotationDegree < 90 || this.rotationDegree >= 270) {
        this.currentSprite$.next(this.frontSprite); // Mostrar sprite frontal
      } else if (this.rotationDegree >= 90 && this.rotationDegree < 270) {
        this.currentSprite$.next(this.backSprite); // Mostrar sprite trasero
      }

      // Aplicar la rotación en el elemento de imagen
      if (this.pokemonImage) {
        this.renderer.setStyle(
          this.pokemonImage.nativeElement,
          'transform',
          `rotateY(${this.rotationDegree}deg)`
        );
      }
    });
  }

  stopAnimation() {
    // Detenemos la suscripción para evitar que la animación continúe
    if (this.animationSubscription) {
      this.animationSubscription.unsubscribe();
      this.animationSubscription = null;
    }
  }

  updateName(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.pokemonNameOrId.next(inputElement?.value.toLowerCase() || '');
  }
}
