-- AlterTable
ALTER TABLE "product" ADD COLUMN     "activationDetails" TEXT,
ADD COLUMN     "ageRating" TEXT,
ADD COLUMN     "countryLimitations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "developers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publishers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "regionName" TEXT,
ADD COLUMN     "releaseDate" TEXT,
ADD COLUMN     "systemRequirements" JSONB;
