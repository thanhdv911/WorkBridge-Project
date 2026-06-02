using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchIdToJobPost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BranchId",
                table: "JobPosts",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobPosts_BranchId",
                table: "JobPosts",
                column: "BranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_JobPosts_Branches",
                table: "JobPosts",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "BranchId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobPosts_Branches",
                table: "JobPosts");

            migrationBuilder.DropIndex(
                name: "IX_JobPosts_BranchId",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "JobPosts");
        }
    }
}
