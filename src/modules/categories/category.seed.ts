import prisma from "../../prisma";

async function seedCategories() {
  const categories = [
    {
      name: "Men's Salon",
      icon: "💇‍♂️",
    },
    {
      name: "Beauty Parlor",
      icon: "💄",
    },
    {
      name: "Unisex Salon",
      icon: "👫",
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        name: category.name,
      },
      update: {
        icon: category.icon,
      },
      create: category,
    });
  }

  console.log("Categories inserted successfully");
}

seedCategories()
  .catch((error) => {
    console.error("Category seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });