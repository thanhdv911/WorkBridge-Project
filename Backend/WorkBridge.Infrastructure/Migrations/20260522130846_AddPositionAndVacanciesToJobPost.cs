using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPositionAndVacanciesToJobPost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Position",
                table: "JobPosts",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Vacancies",
                table: "JobPosts",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Position",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "Vacancies",
                table: "JobPosts");
        }
    }
}
