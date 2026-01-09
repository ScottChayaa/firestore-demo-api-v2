import { Injectable } from '@nestjs/common';
import { FilesRepository } from './repositories/files.repository';
import { FileQueryDto } from './dto/file-query.dto';
import { PaginationResult } from '../common/pagination/pagination.interface';
import { File } from './entities/file.entity';

@Injectable()
export class FilesService {
  constructor(private readonly filesRepo: FilesRepository) {}

  async findAll(query: FileQueryDto): Promise<PaginationResult<File>> {
    return this.filesRepo.findAll(query);
  }

  async findOne(id: string): Promise<File> {
    return this.filesRepo.findById(id);
  }

  async getCategories(): Promise<string[]> {
    return this.filesRepo.getCategories();
  }
}
