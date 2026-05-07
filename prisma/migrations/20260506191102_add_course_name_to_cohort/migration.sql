-- AlterTable
ALTER TABLE "cohorts" ADD COLUMN     "course_name" VARCHAR(100),
ALTER COLUMN "end_date" DROP NOT NULL;
