import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Contexto } from './application/contexto';
import { AcervoService } from './application/services/acervo.service';
import { CatalogoService } from './application/services/catalogo.service';
import { EmprestimoService } from './application/services/emprestimos.service';
import { ReservaService } from './application/services/reservas.service';
import { LivroController } from './presentation/controllers/livro.controller';
import { ExemplarController } from './presentation/controllers/exemplar.controller';
import { EmprestimoController } from './presentation/controllers/emprestimo.controller';
import { ReservaController } from './presentation/controllers/reserva.controller';
import { OcorrenciaController } from './presentation/controllers/ocorrencia.controller';
import { UnidadeController } from './presentation/controllers/unidade.controller';
import { AcessoGuard } from './presentation/http/acesso';

@Module({
  controllers: [LivroController, ExemplarController, ReservaController, EmprestimoController, OcorrenciaController, UnidadeController],
  providers: [CatalogoService, ReservaService, EmprestimoService, AcervoService, { provide: APP_GUARD, useClass: AcessoGuard }],
})
export class AppModule {
  static configurar(contexto: Contexto): DynamicModule {
    return { module: AppModule, providers: [{ provide: Contexto, useValue: contexto }] };
  }
}
