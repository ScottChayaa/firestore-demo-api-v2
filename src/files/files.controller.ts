import { Controller, Get, Param, Query } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileQueryDto } from './dto/file-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { File } from './entities/file.entity';
import { PaginationResult } from '../common/pagination/pagination.interface';

/**
 * 檔案公開 Controller
 * 路徑：/api/files
 * 權限：公開（不需認證）
 */
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * GET /api/files
   * 查詢檔案列表（僅返回已上傳且未刪除的檔案）
   */
  @Public()
  @Get()
  async getFiles(
    @Query() query: FileQueryDto,
  ): Promise<PaginationResult<File>> {
    return this.filesService.findAll(query);
  }

  /**
   * GET /api/files/categories
   * 取得檔案分類列表
   */
  @Public()
  @Get('categories')
  async getCategories(): Promise<string[]> {
    return this.filesService.getCategories();
  }

  /**
   * GET /api/files/:id
   * 取得單一檔案詳情
   */
  @Public()
  @Get(':id')
  async getFileById(@Param('id') id: string): Promise<File> {
    return this.filesService.findOne(id);
  }
}
