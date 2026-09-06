ukuran = 1000000 #kb

with open(f"{ukuran}KB.txt", "w") as file:
    for i in range(ukuran) :
        for j in range(1024) :
            file.write("A")